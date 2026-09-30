import { AIProviderResponse } from './AIProviderResponse';

/**
 * AIProvider - Interface for AI/LLM providers
 *
 * This interface abstracts AI provider implementations (Claude, OpenAI, Gemini, etc.)
 * allowing the AI pipeline to remain provider-agnostic.
 *
 * Implementations are responsible ONLY for:
 * - Sending prompts to the LLM
 * - Receiving and returning the response with metadata
 *
 * Implementations must NOT:
 * - Generate XML, BPMN, or ZIP files
 * - Invoke the compiler
 * - Validate generated code (that's FlowValidator's job)
 * - Parse or transform the response
 *
 * The provider returns both the generated content and telemetry data
 * for monitoring and cost tracking.
 *
 * @example
 * const provider: AIProvider = new ClaudeProvider(apiKey);
 * const response = await provider.generate(prompt);
 * // response.content = "const flow = new IFlow('MyFlow'); ..."
 * // response.promptTokens = 1234
 */
export interface AIProvider {
    /**
     * Generates a response from the AI provider given a prompt
     *
     * @param prompt - The complete prompt to send to the LLM
     * @returns Response with generated content and metadata
     * @throws Error if the API call fails
     *
     * @example
     * const prompt = "Generate TypeScript code for an Integration Flow...";
     * const response = await provider.generate(prompt);
     * console.log(response.content); // Generated TypeScript
     * console.log(response.promptTokens); // Token usage
     */
    generate(prompt: string): Promise<AIProviderResponse>;
}
