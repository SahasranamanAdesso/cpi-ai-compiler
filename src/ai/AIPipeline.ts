import { AIProvider } from './AIProvider';
import { PromptBuilder } from './PromptBuilder';
import { FlowValidator, ValidationResult } from './FlowValidator';
import { GenerationResult } from './GenerationResult';

/**
 * AIPipeline - Orchestrates AI-powered Integration Flow code generation
 *
 * This class is the main entry point for Version 1.1 AI functionality.
 * It coordinates the workflow:
 *
 *   Natural Language → PromptBuilder → AIProvider → FlowValidator → TypeScript
 *
 * Responsibilities:
 * 1. Build prompt from user request
 * 2. Send prompt to AI provider
 * 3. Validate generated TypeScript
 * 4. Return validated TypeScript code
 *
 * Non-Responsibilities:
 * - Compiling TypeScript (Compiler v1.0 handles this separately)
 * - Generating XML/BPMN (Compiler handles this)
 * - Packaging ZIP (Packager handles this)
 * - Deploying to SAP (Future version)
 *
 * The pipeline is provider-agnostic. Any AIProvider implementation
 * (Claude, OpenAI, Gemini, Ollama) can be injected via constructor.
 *
 * @example
 * const pipeline = new AIPipeline(new ClaudeProvider(apiKey));
 * const result = await pipeline.generate("Create a flow that logs messages");
 * if (result.success) {
 *   console.log(result.code); // Valid TypeScript using SAP Integration SDK
 * }
 */
export class AIPipeline {

    private readonly provider: AIProvider;
    private readonly promptBuilder: PromptBuilder;
    private readonly validator: FlowValidator;

    /**
     * Creates a new AIPipeline
     *
     * @param provider - AI provider implementation (Claude, OpenAI, etc.)
     * @param promptBuilder - Optional custom prompt builder (uses default if not provided)
     * @param validator - Optional custom validator (uses default if not provided)
     *
     * @example
     * // Using Claude
     * const pipeline = new AIPipeline(new ClaudeProvider(apiKey));
     *
     * // Using custom components (dependency injection)
     * const pipeline = new AIPipeline(
     *   new ClaudeProvider(apiKey),
     *   new CustomPromptBuilder(),
     *   new CustomValidator()
     * );
     */
    constructor(
        provider: AIProvider,
        promptBuilder?: PromptBuilder,
        validator?: FlowValidator
    ) {
        this.provider = provider;
        this.promptBuilder = promptBuilder || new PromptBuilder();
        this.validator = validator || new FlowValidator();
    }

    /**
     * Generates Integration Flow TypeScript code from natural language
     *
     * Workflow:
     * 1. Build prompt from user request
     * 2. Send to AI provider
     * 3. Validate generated code
     * 4. Return result
     *
     * IMPORTANT: This method does NOT compile the code or generate ZIP files.
     * It returns validated TypeScript that can be passed to the compiler separately.
     *
     * @param userRequest - Natural language description of desired Integration Flow
     * @returns GenerationResult with code and validation status
     *
     * @example
     * const result = await pipeline.generate(
     *   "Create a flow that receives HTTPS requests and modifies the message body"
     * );
     *
     * if (result.success) {
     *   // Pass to compiler (separate step)
     *   const flow = eval(result.code); // or use ts-node/esbuild
     *   const mapper = new BpmnProcessMapper();
     *   const definitions = mapper.map(flow);
     *   // ... continue compilation
     * } else {
     *   console.error('Generation failed:', result.errors);
     * }
     */
    async generate(userRequest: string): Promise<GenerationResult> {
        const startTime = Date.now();

        try {
            // Step 1: Build prompt
            const prompt = this.promptBuilder.build(userRequest);

            // Step 2: Generate code using AI provider
            let providerResponse;
            try {
                providerResponse = await this.provider.generate(prompt);
            } catch (error) {
                return {
                    success: false,
                    code: '',
                    errors: [
                        `AI provider failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                    ],
                    provider: 'Unknown',
                    model: 'Unknown',
                    elapsedMs: Date.now() - startTime
                };
            }

            // Step 3: Validate generated code
            const validationResult = this.validator.validate(providerResponse.content);

            if (!validationResult.isValid) {
                return {
                    success: false,
                    code: providerResponse.content,
                    errors: validationResult.errors,
                    provider: providerResponse.provider,
                    model: providerResponse.model,
                    promptTokens: providerResponse.promptTokens,
                    completionTokens: providerResponse.completionTokens,
                    elapsedMs: Date.now() - startTime,
                    validationResult
                };
            }

            // Step 4: Return validated code with metadata
            return {
                success: true,
                code: providerResponse.content,
                errors: [],
                provider: providerResponse.provider,
                model: providerResponse.model,
                promptTokens: providerResponse.promptTokens,
                completionTokens: providerResponse.completionTokens,
                elapsedMs: Date.now() - startTime,
                validationResult
            };

        } catch (error) {
            return {
                success: false,
                code: '',
                errors: [
                    `Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                ],
                provider: 'Unknown',
                model: 'Unknown',
                elapsedMs: Date.now() - startTime
            };
        }
    }

    /**
     * Generates code with retry on validation failure
     *
     * If the first attempt produces invalid code, this method will retry
     * up to maxRetries times, including validation errors in subsequent prompts.
     *
     * @param userRequest - Natural language description
     * @param maxRetries - Maximum number of retry attempts (default: 2)
     * @returns GenerationResult from first successful attempt or last failure
     *
     * @example
     * const result = await pipeline.generateWithRetry(
     *   "Create a message logger flow",
     *   3 // Try up to 3 times
     * );
     */
    async generateWithRetry(
        userRequest: string,
        maxRetries: number = 2
    ): Promise<GenerationResult> {
        let lastResult: GenerationResult | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            // Build request with feedback from previous attempt
            let request = userRequest;
            if (lastResult && !lastResult.success) {
                request += `\n\nPREVIOUS ATTEMPT HAD ERRORS:\n${lastResult.errors.join('\n')}\nPlease fix these errors.`;
            }

            lastResult = await this.generate(request);

            if (lastResult.success) {
                return lastResult;
            }
        }

        return lastResult!;
    }
}
