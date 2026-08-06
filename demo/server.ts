/**
 * SAP AI Integration Compiler - Demo Server
 *
 * Lightweight Express server for demonstrating the end-to-end capability
 * of Natural Language → SAP Integration Suite workflow.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { IntegrationFlowGenerator } from '../src/ai/IntegrationFlowGenerator';
import { AIPipeline } from '../src/ai/AIPipeline';
import { ClaudeProvider } from '../src/ai/providers/ClaudeProvider';
import { AdessoAIHubProvider } from '../src/ai/providers/AdessoAIHubProvider';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Determine which provider to use
const useAdessoAIHub = process.env.USE_ADESSO_AI_HUB === 'true';

let provider;
let providerName: string;
let isConfigured = false;

if (useAdessoAIHub) {
    // Use adesso AI Hub
    const apiKey = process.env.ADESSO_AI_HUB_API_KEY;
    const apiUrl = process.env.ADESSO_AI_HUB_URL;
    const model = process.env.ADESSO_AI_HUB_MODEL;

    if (!apiKey || !apiUrl) {
        console.error('❌ Error: adesso AI Hub configuration incomplete');
        console.log('\nTo use adesso AI Hub:');
        console.log('1. Create a .env file in the project root');
        console.log('2. Add the following:');
        console.log('   USE_ADESSO_AI_HUB=true');
        console.log('   ADESSO_AI_HUB_API_KEY=your_api_key_here');
        console.log('   ADESSO_AI_HUB_URL=https://your-ai-hub-url/v1/messages');
        console.log('   ADESSO_AI_HUB_MODEL=claude-3-5-sonnet-20241022  # optional');
        console.log('3. Run: npm run demo\n');
        process.exit(1);
    }

    provider = new AdessoAIHubProvider(apiKey, apiUrl, model);
    providerName = 'adesso AI Hub';
    isConfigured = true;
} else {
    // Use Claude directly
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
        console.log('\nTo run the demo:');
        console.log('1. Create a .env file in the project root');
        console.log('2. Add: ANTHROPIC_API_KEY=your_api_key_here');
        console.log('3. Run: npm run demo\n');
        console.log('\nOr to use adesso AI Hub:');
        console.log('   USE_ADESSO_AI_HUB=true');
        console.log('   ADESSO_AI_HUB_API_KEY=your_key');
        console.log('   ADESSO_AI_HUB_URL=your_url\n');
        process.exit(1);
    }

    provider = new ClaudeProvider(apiKey);
    providerName = 'Claude API';
    isConfigured = true;
}

// Create AI pipeline and generator
const pipeline = new AIPipeline(provider);
const generator = new IntegrationFlowGenerator(pipeline);

/**
 * POST /api/generate
 *
 * Generate Integration Flow from natural language prompt
 *
 * Request body:
 * {
 *   "prompt": "Create a flow that..."
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "zipFile": "base64-encoded-zip",
 *   "generatedCode": "typescript code",
 *   "executionTime": 2345,
 *   "flowName": "MyFlow",
 *   "provider": "Claude",
 *   "model": "claude-3-5-sonnet-20241022",
 *   "tokens": 1801
 * }
 */
app.post('/api/generate', async (req, res) => {
    const startTime = Date.now();

    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({
                success: false,
                errors: ['Prompt is required and must be a string']
            });
        }

        console.log('\n🚀 Demo Request Received');
        console.log(`   Prompt: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`);

        // Generate unique output path
        const timestamp = Date.now();
        const outputDir = path.join(__dirname, '..', 'temp');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputPath = path.join(outputDir, `Demo_${timestamp}.zip`);

        // Call existing IntegrationFlowGenerator
        // This orchestrates: AI → TypeScript → Compile → Package → ZIP
        const result = await generator.generate(prompt, outputPath);

        if (!result.success) {
            console.log('❌ Generation Failed');
            return res.status(500).json({
                success: false,
                errors: result.errors
            });
        }

        // Read generated .zip file and encode as base64
        const zipBuffer = fs.readFileSync(outputPath);
        const zipBase64 = zipBuffer.toString('base64');

        // Clean up .zip file
        fs.unlinkSync(outputPath);

        console.log('✅ Demo Request Complete');
        console.log(`   Flow: ${result.flowName}`);
        console.log(`   Time: ${result.elapsedMs}ms\n`);

        // Return result to frontend
        res.json({
            success: true,
            zipFile: zipBase64,
            fileName: `${result.flowName}.zip`,
            generatedCode: result.generationResult?.code || '',
            executionTime: result.elapsedMs,
            flowName: result.flowName,
            provider: result.generationResult?.provider || '',
            model: result.generationResult?.model || '',
            tokens: result.generationResult?.promptTokens && result.generationResult?.completionTokens
                ? result.generationResult.promptTokens + result.generationResult.completionTokens
                : undefined
        });

    } catch (error) {
        console.error('❌ Server Error:', error);

        res.status(500).json({
            success: false,
            errors: [
                error instanceof Error
                    ? error.message
                    : 'An unexpected error occurred'
            ]
        });
    }
});

/**
 * GET /api/health
 *
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        provider: providerName,
        apiKeyConfigured: isConfigured,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🚀 SAP AI Integration Compiler - Demo Server');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n   Server running at: http://localhost:${PORT}`);
    console.log(`   AI Provider: ${providerName} ✅`);
    console.log('\n   Open your browser to http://localhost:' + PORT);
    console.log('\n═══════════════════════════════════════════════════════════════\n');
});
