/**
 * Deploy-With-Retry Demo
 *
 * Demonstrates the deploy -> SAP error feedback -> regenerate loop:
 *
 *   Natural Language
 *         v
 *   IntegrationFlowGenerator (AI + Compiler, unchanged)
 *         v
 *   .zip
 *         v
 *   Deployer.deployZip()  ---ERROR--->  Deployer.getArtifactError()
 *         |                                    |
 *      STARTED                                 v
 *         |                          feedback appended to next request
 *         v                                    |
 *      success                    <------------+ (regenerate, redeploy)
 *
 * DeploymentOrchestrator has NO compile-time dependency on any concrete
 * deployer package - it only needs an object matching the `Deployer`
 * interface. This demo shows both paths:
 *
 * - If CPI_CLIENT_ID (and friends) are set in the environment, it lazily
 *   requires `@david10ten/deployer` and talks to a real SAP tenant.
 * - Otherwise, it falls back to an in-memory mock Deployer that fails once
 *   (simulating a bad first attempt) and then succeeds, so this demo is
 *   runnable by anyone with just an ANTHROPIC_API_KEY.
 */

import { IntegrationFlowGenerator } from '../src/ai/IntegrationFlowGenerator';
import { AIPipeline } from '../src/ai/AIPipeline';
import { ClaudeProvider } from '../src/ai/providers/ClaudeProvider';
import { DeploymentOrchestrator } from '../src/ai/DeploymentOrchestrator';
import { Deployer, DeployZipParams, DeployPollOptions, DeployResult } from '../src/ai/Deployer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

/**
 * An in-memory mock Deployer for demoing the retry loop without SAP
 * credentials. Fails with a canned Groovy compile error on the first
 * attempt, then reports success on any subsequent attempt.
 */
function createMockDeployer(): Deployer {
    let attempts = 0;

    return {
        async deployZip(_params: DeployZipParams, _pollOptions?: DeployPollOptions): Promise<DeployResult> {
            attempts++;
            if (attempts < 2) {
                return { status: 'ERROR', raw: { attempt: attempts } };
            }
            return { status: 'STARTED' };
        },

        async getArtifactError(_id: string): Promise<unknown | null> {
            return {
                errorMessage: 'Groovy script compilation failed: unexpected token at line 3',
                errorType: 'SCRIPT_COMPILE_ERROR'
            };
        }
    };
}

/**
 * Builds a real Deployer from `@david10ten/deployer` when CPI credentials
 * are configured in the environment, otherwise falls back to the mock.
 *
 * Consumers of this SDK wire up their own Deployer this way - the compiler
 * never imports the deployer package itself.
 */
function buildDeployer(): Deployer {
    if (process.env.CPI_CLIENT_ID) {
        console.log('Using @david10ten/deployer with credentials from the environment.\n');
        // Optional dependency - only required when the consumer has actually
        // installed it. See cpi-ai-deployer's README for install/auth setup.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { CpiDeployer } = require('@david10ten/deployer');
        return new CpiDeployer();
    }

    console.log('CPI_CLIENT_ID not set - using an in-memory mock Deployer for this demo.\n');
    return createMockDeployer();
}

async function main() {
    console.log('SAP Integration SDK - Deploy-With-Retry Demo\n');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error('Error: ANTHROPIC_API_KEY environment variable not set');
        console.log('\nTo use this demo:');
        console.log('1. Create a .env file in the project root');
        console.log('2. Add: ANTHROPIC_API_KEY=your_api_key_here');
        console.log('3. Run: npm run deploy-retry-demo\n');
        process.exit(1);
    }

    const generator = new IntegrationFlowGenerator(new AIPipeline(new ClaudeProvider(apiKey)));
    const deployer = buildDeployer();

    const orchestrator = new DeploymentOrchestrator(
        generator,
        deployer,
        { id: 'AI_Generated_Flow', name: 'AI Generated Flow', packageId: 'AIGeneratedPackage' }
    );

    const outputPath = path.join(process.cwd(), 'AI_Generated_DeployRetry.zip');

    console.log('Starting deploy-with-retry loop...\n');

    const result = await orchestrator.deployWithRetry(
        'Create an Integration Flow that receives HTTPS requests and sets the message body to "Hello from AI-powered Integration Suite!"',
        outputPath,
        3
    );

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log(result.success ? 'DEPLOYED SUCCESSFULLY' : 'DEPLOYMENT FAILED after all attempts');
    console.log(`Total attempts: ${result.attempts.length}`);
    console.log(`Final status: ${result.finalStatus ?? 'n/a'}`);
    console.log(`Total time: ${result.elapsedMs}ms\n`);

    result.attempts.forEach((attempt) => {
        const genOutcome = attempt.generationErrors.length === 0 ? 'generation OK' : 'generation FAILED';
        const deployOutcome = attempt.deployResult ? `deploy=${attempt.deployResult.status}` : 'deploy not attempted';
        console.log(`  Attempt ${attempt.attemptNumber}: ${genOutcome}, ${deployOutcome}`);
        if (attempt.feedbackGiven) {
            console.log(`    Feedback sent to next attempt: ${attempt.feedbackGiven.split('\n')[0]}...`);
        }
    });

    console.log();
}

main().catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
});
