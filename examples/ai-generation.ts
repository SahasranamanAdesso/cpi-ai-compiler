/**
 * AI-Powered Integration Flow Generation Demo
 *
 * This example demonstrates Version 1.1 AI functionality:
 * Natural Language → AI Pipeline → Validated TypeScript
 *
 * The AI generates ONLY TypeScript using the SAP Integration SDK.
 * The compiler (v1.0) remains completely unchanged.
 *
 * Flow:
 *   User Request (Natural Language)
 *        ↓
 *   PromptBuilder
 *        ↓
 *   ClaudeProvider
 *        ↓
 *   SDKValidator
 *        ↓
 *   Generated TypeScript
 *
 * The generated TypeScript can then be passed to the existing
 * compiler to produce HelloWorld.zip.
 */

import { AIPipeline } from '../src/ai/AIPipeline';
import { ClaudeProvider } from '../src/ai/providers/ClaudeProvider';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function demonstrateAIGeneration() {
    console.log('🤖 SAP Integration SDK - AI Code Generation Demo\n');
    console.log('Version 1.1 - AI Frontend\n');

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
        console.log('\nTo use this demo:');
        console.log('1. Create a .env file in the project root');
        console.log('2. Add: ANTHROPIC_API_KEY=your_api_key_here');
        console.log('3. Run: npm run ai-demo\n');
        process.exit(1);
    }

    // Create AI pipeline with Claude provider
    const provider = new ClaudeProvider(apiKey);
    const pipeline = new AIPipeline(provider);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Example 1: Simple message modification
    await demonstrateExample(
        pipeline,
        'Example 1: Simple Message Modification',
        'Create an Integration Flow that receives HTTPS requests and sets the message body to "Hello from AI-generated Integration Flow!"'
    );

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Example 2: Multi-step processing
    await demonstrateExample(
        pipeline,
        'Example 2: Multi-Step Processing',
        'Create an Integration Flow with two processing steps: first step sets body to "Step 1 completed", second step sets body to "Step 2 completed"'
    );

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ AI Generation Demo Complete\n');
    console.log('Next Steps:');
    console.log('1. Take the generated TypeScript code');
    console.log('2. Pass it to the existing compiler (v1.0 - unchanged)');
    console.log('3. Compiler generates HelloWorld.zip');
    console.log('4. Import into SAP Integration Suite\n');
}

/**
 * Demonstrates a single AI generation example
 */
async function demonstrateExample(
    pipeline: AIPipeline,
    title: string,
    userRequest: string
) {
    console.log(`📝 ${title}\n`);
    console.log(`User Request:\n"${userRequest}"\n`);

    console.log('Generating TypeScript code using AI...\n');

    const startTime = Date.now();
    const result = await pipeline.generate(userRequest);
    const duration = Date.now() - startTime;

    if (result.success) {
        console.log('✅ Generation Successful\n');
        console.log(`Generated TypeScript (${duration}ms):\n`);
        console.log('─────────────────────────────────────────────────────────────');
        console.log(result.code);
        console.log('─────────────────────────────────────────────────────────────\n');

        console.log('Validation Result:');
        console.log('  ✓ Code is not empty');
        console.log('  ✓ Contains exactly one IFlow');
        console.log('  ✓ Contains at least one Component');
        console.log('  ✓ Uses only supported SDK classes');
        console.log('  ✓ Exports the flow');
        console.log('  ✓ No XML/BPMN generation');
        console.log('  ✓ No file/ZIP generation\n');

        console.log('📦 This TypeScript can now be passed to the compiler (v1.0)');
        console.log('   The compiler will generate HelloWorld.zip\n');

    } else {
        console.log('❌ Generation Failed\n');
        console.log('Errors:');
        result.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
        });
        console.log();

        if (result.code) {
            console.log('Generated Code (invalid):');
            console.log('─────────────────────────────────────────────────────────────');
            console.log(result.code);
            console.log('─────────────────────────────────────────────────────────────\n');
        }
    }
}

// Run demonstration
demonstrateAIGeneration().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
});
