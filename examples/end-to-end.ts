/**
 * End-to-End Integration Flow Generation Demo
 *
 * Version 1.1 Phase 2 - Complete Workflow
 *
 * This demonstrates the complete integration:
 *   Natural Language → AI Frontend → TypeScript → Compiler → .zip
 *
 * Architecture:
 *
 *   User Request (Natural Language)
 *         ↓
 *   AIPipeline (AI Frontend v1.1)
 *         ↓
 *   Generated TypeScript Code
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
 *         ↓
 *   SAP Integration Suite
 */

import { IntegrationFlowGenerator } from '../src/ai/IntegrationFlowGenerator';
import { AIPipeline } from '../src/ai/AIPipeline';
import { ClaudeProvider } from '../src/ai/providers/ClaudeProvider';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function runEndToEndDemo() {
    console.log('🚀 SAP Integration SDK - End-to-End Generation Demo\n');
    console.log('Version 1.1 Phase 2 - AI Frontend + Compiler Backend\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
        console.log('\nTo use this demo:');
        console.log('1. Create a .env file in the project root');
        console.log('2. Add: ANTHROPIC_API_KEY=your_api_key_here');
        console.log('3. Run: npm run e2e-demo\n');
        process.exit(1);
    }

    // Create AI pipeline
    const provider = new ClaudeProvider(apiKey);
    const pipeline = new AIPipeline(provider);

    // Create end-to-end generator
    const generator = new IntegrationFlowGenerator(pipeline);

    console.log('═══════════════════════════════════════════════════════════════\n');

    // Example 1: Simple message flow
    await demonstrateGeneration(
        generator,
        'Example 1: Simple Message Flow',
        'Create an Integration Flow that receives HTTPS requests and sets the message body to "Hello from AI-powered Integration Suite!"',
        'AI_Generated_HelloWorld.zip'
    );

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    // Example 2: Multi-step flow
    await demonstrateGeneration(
        generator,
        'Example 2: Multi-Step Processing',
        'Create an Integration Flow with two processing steps: the first step sets the body to "Processing started", and the second step sets the body to "Processing completed"',
        'AI_Generated_MultiStep.zip'
    );

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    console.log('✅ End-to-End Demo Complete!\n');
    console.log('Next Steps:');
    console.log('1. Check the generated .zip files in the current directory');
    console.log('2. Open SAP Integration Suite');
    console.log('3. Navigate to Design → Integrations');
    console.log('4. Click Import');
    console.log('5. Upload the generated .zip file');
    console.log('6. Open in graphical editor ✅\n');
    console.log('The Integration Flow was generated entirely from natural language!');
}

/**
 * Demonstrates a single end-to-end generation
 */
async function demonstrateGeneration(
    generator: IntegrationFlowGenerator,
    title: string,
    request: string,
    outputFile: string
) {
    console.log(`📝 ${title}\n`);
    console.log(`Natural Language Request:`);
    console.log(`"${request}"\n`);

    const outputPath = path.join(process.cwd(), outputFile);

    console.log(`Output: ${outputFile}\n`);
    console.log('Starting generation...\n');

    const result = await generator.generate(request, outputPath);

    if (result.success) {
        console.log('\n✨ GENERATION SUCCESSFUL!\n');
        console.log('Summary:');
        console.log(`  Flow Name: ${result.flowName}`);
        console.log(`  Output: ${result.outputPath}`);
        console.log(`  Total Time: ${result.elapsedMs}ms`);

        if (result.generationResult) {
            console.log(`  AI Provider: ${result.generationResult.provider}`);
            console.log(`  Model: ${result.generationResult.model}`);

            if (result.generationResult.promptTokens && result.generationResult.completionTokens) {
                const total = result.generationResult.promptTokens + result.generationResult.completionTokens;
                console.log(`  Tokens: ${total} (${result.generationResult.promptTokens} prompt + ${result.generationResult.completionTokens} completion)`);
            }
        }

        console.log('\n📦 Generated Integration Flow is ready for SAP Integration Suite');
        console.log('   Import the .zip file to see the flow in the graphical editor\n');

    } else {
        console.log('\n❌ GENERATION FAILED\n');
        console.log('Errors:');
        result.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
        });
        console.log();
    }
}

// Run demonstration
runEndToEndDemo().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
});
