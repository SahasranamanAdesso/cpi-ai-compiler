/**
 * DeploymentOrchestrator Tests
 *
 * Proves the deploy -> SAP error feedback -> regenerate loop terminates
 * correctly under every outcome, without requiring an ANTHROPIC_API_KEY or
 * real SAP credentials:
 *
 * - Deploy fails once, then succeeds -> loop retries and reports success,
 *   carrying the SAP error text into the next attempt's feedback.
 * - Deploy always fails -> loop exhausts maxAttempts and reports failure.
 * - getArtifactError() resolves null -> generic fallback feedback is used.
 * - Deploy times out -> getArtifactError is never called, timeout-specific
 *   feedback is used instead.
 * - Generation itself fails -> deployer.deployZip is never called.
 *
 * IntegrationFlowGenerator is stubbed (not a real AIPipeline/ClaudeProvider)
 * since DeploymentOrchestrator only ever calls its `generate(request, outputPath)`
 * method - the stub lets these tests run without any API key or network access.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DeploymentOrchestrator } from '../src/ai/DeploymentOrchestrator';
import { IntegrationFlowGenerator, IntegrationFlowResult } from '../src/ai/IntegrationFlowGenerator';
import { Deployer, DeployZipParams, DeployPollOptions, DeployResult } from '../src/ai/Deployer';

const ARTIFACT = { id: 'TestFlow', name: 'Test Flow', packageId: 'TestPackage' };

function tempZipPath(): string {
    return path.join(os.tmpdir(), `deployment-orchestrator-test-${Date.now()}-${Math.random()}.zip`);
}

/** A stub IntegrationFlowGenerator that always succeeds and writes a dummy .zip file. */
function createSucceedingGenerator(): IntegrationFlowGenerator {
    return {
        async generate(_request: string, outputPath: string): Promise<IntegrationFlowResult> {
            fs.writeFileSync(outputPath, 'dummy-zip-content');
            return {
                success: true,
                errors: [],
                outputPath,
                flowName: 'TestFlow',
                elapsedMs: 1
            };
        }
    } as unknown as IntegrationFlowGenerator;
}

/** A stub IntegrationFlowGenerator that always fails local validation (never writes a .zip). */
function createFailingGenerator(): IntegrationFlowGenerator {
    return {
        async generate(_request: string, _outputPath: string): Promise<IntegrationFlowResult> {
            return {
                success: false,
                errors: ['Generated code is empty'],
                elapsedMs: 1
            };
        }
    } as unknown as IntegrationFlowGenerator;
}

/**
 * Test 1: Deploy fails once with a structured SAP error, then succeeds.
 */
async function testRetrySucceedsAfterSapError() {
    console.log('🧪 Test 1: Retry succeeds after SAP deployment error\n');

    let deployCalls = 0;
    const deployer: Deployer = {
        async deployZip(_params: DeployZipParams, _pollOptions?: DeployPollOptions): Promise<DeployResult> {
            deployCalls++;
            if (deployCalls === 1) {
                return { status: 'ERROR' };
            }
            return { status: 'STARTED' };
        },
        async getArtifactError(_id: string): Promise<unknown | null> {
            return { errorMessage: 'Groovy script compilation failed: unexpected token at line 3' };
        }
    };

    const orchestrator = new DeploymentOrchestrator(createSucceedingGenerator(), deployer, ARTIFACT);
    const result = await orchestrator.deployWithRetry('Create a flow', tempZipPath(), 3);

    if (!result.success) throw new Error('Expected success after retry');
    if (result.attempts.length !== 2) throw new Error(`Expected 2 attempts, got ${result.attempts.length}`);
    if (result.finalStatus !== 'STARTED') throw new Error(`Expected finalStatus STARTED, got ${result.finalStatus}`);

    const firstAttempt = result.attempts[0];
    if (!firstAttempt.feedbackGiven || !firstAttempt.feedbackGiven.includes('Groovy script compilation failed')) {
        throw new Error('Expected first attempt feedback to include the SAP error text');
    }

    console.log('✅ Test 1 PASSED\n');
}

/**
 * Test 2: Deploy always fails -> loop exhausts maxAttempts.
 */
async function testExhaustsMaxAttempts() {
    console.log('🧪 Test 2: Exhausts maxAttempts when deploy always fails\n');

    const deployer: Deployer = {
        async deployZip(): Promise<DeployResult> {
            return { status: 'ERROR' };
        },
        async getArtifactError(): Promise<unknown | null> {
            return { errorMessage: 'Persistent failure' };
        }
    };

    const orchestrator = new DeploymentOrchestrator(createSucceedingGenerator(), deployer, ARTIFACT);
    const result = await orchestrator.deployWithRetry('Create a flow', tempZipPath(), 2);

    if (result.success) throw new Error('Expected failure after exhausting attempts');
    if (result.attempts.length !== 2) throw new Error(`Expected 2 attempts, got ${result.attempts.length}`);
    if (result.finalStatus !== 'ERROR') throw new Error(`Expected finalStatus ERROR, got ${result.finalStatus}`);

    console.log('✅ Test 2 PASSED\n');
}

/**
 * Test 3: getArtifactError resolves null -> generic fallback feedback, no throw.
 */
async function testNullErrorDetailFallback() {
    console.log('🧪 Test 3: null getArtifactError produces generic fallback feedback\n');

    const deployer: Deployer = {
        async deployZip(): Promise<DeployResult> {
            return { status: 'ERROR' };
        },
        async getArtifactError(): Promise<unknown | null> {
            return null;
        }
    };

    const orchestrator = new DeploymentOrchestrator(createSucceedingGenerator(), deployer, ARTIFACT);
    const result = await orchestrator.deployWithRetry('Create a flow', tempZipPath(), 1);

    const feedback = result.attempts[0].feedbackGiven;
    if (!feedback || !feedback.includes('no structured error detail was')) {
        throw new Error(`Expected generic fallback feedback, got: ${feedback}`);
    }

    console.log('✅ Test 3 PASSED\n');
}

/**
 * Test 4: Deploy times out -> getArtifactError is never called.
 */
async function testTimeoutSkipsGetArtifactError() {
    console.log('🧪 Test 4: TIMEOUT status skips getArtifactError\n');

    let getArtifactErrorCalls = 0;
    const deployer: Deployer = {
        async deployZip(): Promise<DeployResult> {
            return { status: 'TIMEOUT' };
        },
        async getArtifactError(): Promise<unknown | null> {
            getArtifactErrorCalls++;
            return { errorMessage: 'should not be called' };
        }
    };

    const orchestrator = new DeploymentOrchestrator(createSucceedingGenerator(), deployer, ARTIFACT);
    const result = await orchestrator.deployWithRetry('Create a flow', tempZipPath(), 1);

    if (getArtifactErrorCalls !== 0) throw new Error('Expected getArtifactError NOT to be called on TIMEOUT');

    const feedback = result.attempts[0].feedbackGiven;
    if (!feedback || !feedback.includes('polling timeout')) {
        throw new Error(`Expected timeout-specific feedback, got: ${feedback}`);
    }

    console.log('✅ Test 4 PASSED\n');
}

/**
 * Test 5: Generation fails -> deployer.deployZip is never called.
 */
async function testGenerationFailureSkipsDeploy() {
    console.log('🧪 Test 5: Generation failure never reaches deploy\n');

    let deployCalls = 0;
    const deployer: Deployer = {
        async deployZip(): Promise<DeployResult> {
            deployCalls++;
            return { status: 'STARTED' };
        },
        async getArtifactError(): Promise<unknown | null> {
            return null;
        }
    };

    const orchestrator = new DeploymentOrchestrator(createFailingGenerator(), deployer, ARTIFACT);
    const result = await orchestrator.deployWithRetry('Create a flow', tempZipPath(), 2);

    if (deployCalls !== 0) throw new Error('Expected deployZip NOT to be called when generation fails');
    if (result.success) throw new Error('Expected overall failure when generation always fails');
    if (result.attempts.length !== 2) throw new Error(`Expected 2 attempts, got ${result.attempts.length}`);
    if (result.attempts[0].generationErrors.length === 0) throw new Error('Expected generationErrors to be recorded');

    console.log('✅ Test 5 PASSED\n');
}

async function runAllTests() {
    console.log('='.repeat(60));
    console.log('  DeploymentOrchestrator Tests');
    console.log('='.repeat(60));
    console.log();

    try {
        await testRetrySucceedsAfterSapError();
        await testExhaustsMaxAttempts();
        await testNullErrorDetailFallback();
        await testTimeoutSkipsGetArtifactError();
        await testGenerationFailureSkipsDeploy();

        console.log('='.repeat(60));
        console.log('  🎉 ALL TESTS PASSED');
        console.log('='.repeat(60));
        console.log();
    } catch (error) {
        console.error('\n❌ TEST FAILED:');
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    runAllTests();
}
