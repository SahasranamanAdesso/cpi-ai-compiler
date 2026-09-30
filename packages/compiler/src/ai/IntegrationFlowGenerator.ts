import { AIPipeline } from './AIPipeline';
import { CodeExecutor } from './CodeExecutor';
import { BpmnProcessMapper } from '../mapper/BpmnProcessMapper';
import { IflowSerializer } from '../serializer/IflowSerializer';
import { IflowPackager } from '../packager/IflowPackager';
import { GenerationResult } from './GenerationResult';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * IntegrationFlowGenerator - End-to-end Integration Flow generation
 *
 * This class connects the AI Frontend (v1.1) to the Compiler Backend (v1.0)
 * to achieve complete natural language → .zip workflow.
 *
 * Architecture:
 *
 *   Natural Language
 *         ↓
 *   AIPipeline (AI Frontend)
 *         ↓
 *   Generated TypeScript
 *         ↓
 *   CodeExecutor
 *         ↓
 *   IFlow instance
 *         ↓
 *   BpmnProcessMapper (Compiler v1.0)
 *         ↓
 *   BpmnDefinitions (IR)
 *         ↓
 *   IflowSerializer
 *         ↓
 *   IflowPackager
 *         ↓
 *   HelloWorld.zip
 *
 * This is the INTEGRATION LAYER that connects two frozen architectures.
 */
export class IntegrationFlowGenerator {
    private readonly pipeline: AIPipeline;
    private readonly executor: CodeExecutor;
    private readonly mapper: BpmnProcessMapper;
    private readonly serializer: IflowSerializer;
    private readonly packager: IflowPackager;

    /**
     * Creates a new IntegrationFlowGenerator
     *
     * @param pipeline - AI pipeline for code generation
     *
     * @example
     * const provider = new ClaudeProvider(apiKey);
     * const pipeline = new AIPipeline(provider);
     * const generator = new IntegrationFlowGenerator(pipeline);
     */
    constructor(pipeline: AIPipeline) {
        this.pipeline = pipeline;
        this.executor = new CodeExecutor();
        this.mapper = new BpmnProcessMapper();
        this.serializer = new IflowSerializer();
        this.packager = new IflowPackager();
    }

    /**
     * Generates a complete Integration Flow from natural language
     *
     * Complete end-to-end workflow:
     * 1. AI generates TypeScript code
     * 2. Execute TypeScript → IFlow
     * 3. Compile IFlow → BPMN IR
     * 4. Serialize IR → .iflw files
     * 5. Package → .zip
     *
     * @param request - Natural language description
     * @param outputPath - Path for generated .zip file
     * @returns Result with generation metadata and output path
     *
     * @example
     * const generator = new IntegrationFlowGenerator(pipeline);
     * const result = await generator.generate(
     *   "Create a flow that receives HTTPS requests and sets body to Hello World",
     *   "./output/MyFlow.zip"
     * );
     *
     * if (result.success) {
     *   console.log('Generated:', result.outputPath);
     *   // Import result.outputPath into SAP Integration Suite
     * }
     */
    async generate(
        request: string,
        outputPath: string
    ): Promise<IntegrationFlowResult> {
        const startTime = Date.now();

        try {
            // Step 1: Generate TypeScript code using AI
            console.log('🤖 Generating TypeScript code...');
            const aiResult = await this.pipeline.generate(request);

            if (!aiResult.success) {
                return {
                    success: false,
                    errors: aiResult.errors,
                    generationResult: aiResult,
                    elapsedMs: Date.now() - startTime
                };
            }

            console.log('✅ TypeScript generated');
            console.log(`   Provider: ${aiResult.provider}`);
            console.log(`   Model: ${aiResult.model}`);
            if (aiResult.promptTokens && aiResult.completionTokens) {
                console.log(`   Tokens: ${aiResult.promptTokens} + ${aiResult.completionTokens} = ${aiResult.promptTokens + aiResult.completionTokens}`);
            }

            // Step 2: Execute TypeScript code → IFlow
            console.log('\n⚙️  Executing TypeScript...');
            let flow;
            try {
                flow = this.executor.execute(aiResult.code);
                console.log(`✅ IFlow created: ${flow.name}`);
            } catch (error) {
                return {
                    success: false,
                    errors: [
                        error instanceof Error ? error.message : 'Code execution failed'
                    ],
                    generationResult: aiResult,
                    elapsedMs: Date.now() - startTime
                };
            }

            // Step 3: Compile IFlow → BPMN IR (Compiler v1.0)
            console.log('\n🔧 Compiling to BPMN...');
            const definitions = this.mapper.map(flow);
            console.log('✅ BPMN IR generated');

            // Step 4: Serialize to file system
            console.log('\n📝 Serializing to files...');
            const tempDir = path.join(os.tmpdir(), `iflow-${Date.now()}`);
            this.serializer.serialize(definitions, tempDir, flow.name);
            console.log(`✅ Files written to ${tempDir}`);

            // Step 5: Package to .zip
            console.log('\n📦 Packaging to .zip...');
            await this.packager.package(tempDir, flow.name, outputPath);
            console.log(`✅ Package created: ${outputPath}`);

            // Clean up temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });

            // Success!
            const totalTime = Date.now() - startTime;
            console.log(`\n🎉 SUCCESS! Generated in ${totalTime}ms`);

            return {
                success: true,
                errors: [],
                outputPath,
                flowName: flow.name,
                generationResult: aiResult,
                elapsedMs: totalTime
            };

        } catch (error) {
            return {
                success: false,
                errors: [
                    error instanceof Error ? error.message : 'Unknown error'
                ],
                elapsedMs: Date.now() - startTime
            };
        }
    }
}

/**
 * Result of end-to-end Integration Flow generation
 */
export interface IntegrationFlowResult {
    /** Whether generation succeeded */
    success: boolean;

    /** List of errors (empty if success) */
    errors: string[];

    /** Path to generated .zip file (if success) */
    outputPath?: string;

    /** Name of generated Integration Flow (if success) */
    flowName?: string;

    /** AI generation result (includes code, provider, tokens) */
    generationResult?: GenerationResult;

    /** Total elapsed time in milliseconds */
    elapsedMs: number;
}
