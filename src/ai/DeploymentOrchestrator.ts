import * as fs from 'fs';
import { IntegrationFlowGenerator } from './IntegrationFlowGenerator';
import { Deployer, DeployZipParams, DeployPollOptions, DeployResult } from './Deployer';
import { DeploymentResult, DeploymentAttempt } from './DeploymentResult';

/**
 * Identity of the SAP Integration Designtime Artifact being deployed.
 */
export interface ArtifactIdentity {
    id: string;
    name: string;
    packageId: string;
}

/**
 * DeploymentOrchestrator - Deploy-generate-retry loop against SAP Integration Suite
 *
 * Composes an IntegrationFlowGenerator (AI generation + compile + package,
 * used unmodified) with an injected Deployer (structural interface - no
 * hard dependency on any concrete deployment package, e.g. `@david10ten/deployer`).
 *
 * Loop per attempt:
 *   1. IntegrationFlowGenerator.generate(request, outputPath) - `request`
 *      includes accumulated feedback from the previous attempt, if any.
 *   2. If generation failed -> record the attempt and feed its errors back
 *      into the next request (same pattern as AIPipeline.generateWithRetry).
 *      Deployment is never attempted this round.
 *   3. If generation succeeded -> base64-encode the .zip and deployer.deployZip(...).
 *   4. status === 'STARTED' -> success, stop.
 *   5. status === 'ERROR' -> deployer.getArtifactError(id), format as feedback, retry.
 *   6. status === 'TIMEOUT' -> getArtifactError is skipped (SAP may not have
 *      written error info yet); use a generic timeout feedback message.
 *   7. Stop when maxAttempts is reached or a deployment succeeds.
 *
 * A thrown error from deployer.deployZip itself (transport/auth failure, not
 * a deployment outcome) is not treated as retryable - it propagates
 * immediately, since regenerating code cannot fix a network/auth problem.
 *
 * Non-responsibilities (unchanged from IntegrationFlowGenerator's contract):
 * - Writers / BPMN IR / packaging internals
 * - Deployment protocol details (delegated entirely to the injected Deployer)
 *
 * @example
 * const orchestrator = new DeploymentOrchestrator(
 *     new IntegrationFlowGenerator(new AIPipeline(new ClaudeProvider(apiKey))),
 *     new CpiDeployer(),
 *     { id: 'MyFlow', name: 'My Flow', packageId: 'MyPackage' }
 * );
 * const result = await orchestrator.deployWithRetry(
 *     'Create a flow that logs messages',
 *     './MyFlow.zip'
 * );
 */
export class DeploymentOrchestrator {
    private static readonly MAX_FEEDBACK_LENGTH = 4000;

    constructor(
        private readonly generator: IntegrationFlowGenerator,
        private readonly deployer: Deployer,
        private readonly artifact: ArtifactIdentity
    ) {}

    /**
     * Generates, deploys, and - on SAP deployment failure - regenerates a
     * corrected Integration Flow using SAP's own error feedback, looping
     * until deployment succeeds or maxAttempts is exhausted.
     *
     * @param userRequest - Natural language description of desired Integration Flow
     * @param outputPath - Path for the generated .zip file (overwritten each attempt)
     * @param maxAttempts - Maximum number of generate+deploy attempts (default: 3)
     * @param pollOptions - Forwarded to Deployer.deployZip's runtime status polling
     */
    async deployWithRetry(
        userRequest: string,
        outputPath: string,
        maxAttempts: number = 3,
        pollOptions?: DeployPollOptions
    ): Promise<DeploymentResult> {
        const startTime = Date.now();
        const attempts: DeploymentAttempt[] = [];
        let request = userRequest;
        let lastFlowName: string | undefined;

        for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
            const genResult = await this.generator.generate(request, outputPath);

            if (!genResult.success) {
                attempts.push({
                    attemptNumber,
                    generationResult: genResult.generationResult,
                    generationErrors: genResult.errors
                });

                request = `${userRequest}\n\nPREVIOUS ATTEMPT HAD ERRORS:\n${genResult.errors.join('\n')}\nPlease fix these errors.`;
                continue;
            }

            lastFlowName = genResult.flowName;

            const zipBase64 = fs.readFileSync(outputPath).toString('base64');
            const deployParams: DeployZipParams = { ...this.artifact, zipBase64 };

            const deployResult = await this.deployer.deployZip(deployParams, pollOptions);

            if (deployResult.status === 'STARTED') {
                attempts.push({
                    attemptNumber,
                    generationResult: genResult.generationResult,
                    generationErrors: [],
                    flowName: genResult.flowName,
                    deployResult
                });

                return {
                    success: true,
                    finalStatus: 'STARTED',
                    attempts,
                    outputPath,
                    flowName: genResult.flowName,
                    elapsedMs: Date.now() - startTime
                };
            }

            const sapErrorDetail = deployResult.status === 'ERROR'
                ? await this.deployer.getArtifactError(this.artifact.id)
                : undefined;

            const feedback = this.formatSapErrorFeedback(deployResult.status, sapErrorDetail ?? null);

            attempts.push({
                attemptNumber,
                generationResult: genResult.generationResult,
                generationErrors: [],
                flowName: genResult.flowName,
                deployResult,
                sapErrorDetail,
                feedbackGiven: feedback
            });

            request = `${userRequest}\n\nPREVIOUS ATTEMPT WAS DEPLOYED BUT SAP REPORTED A DEPLOYMENT ERROR:\n${feedback}\nPlease regenerate the Integration Flow to fix this deployment issue.`;
        }

        const lastAttempt = attempts[attempts.length - 1];

        return {
            success: false,
            finalStatus: lastAttempt?.deployResult?.status,
            attempts,
            outputPath,
            flowName: lastFlowName,
            elapsedMs: Date.now() - startTime
        };
    }

    /**
     * Formats a Deployer error result into natural-language feedback for the
     * next AI generation attempt. This is a seam for a future
     * MessageProcessingLogs fallback (when getArtifactError resolves null on
     * tenants that don't populate it) - out of scope for v1.
     */
    private formatSapErrorFeedback(status: 'ERROR' | 'TIMEOUT', detail: unknown): string {
        if (status === 'TIMEOUT') {
            return 'Deployment did not reach a terminal state within the polling timeout. ' +
                'SAP did not report a specific error in time; treat this as a possible ' +
                'runtime/startup issue with the generated flow (e.g. missing configuration, ' +
                'long-running initialization, or an adapter that failed to start).';
        }

        if (detail === null || detail === undefined) {
            return 'SAP reported a deployment ERROR status but no structured error detail was ' +
                'available from the tenant (getArtifactError returned empty). Review the flow ' +
                'for common causes: invalid adapter configuration, missing required properties, ' +
                'or unsupported component combinations.';
        }

        let text: string;
        try {
            text = typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2);
        } catch {
            text = String(detail);
        }

        if (text.length > DeploymentOrchestrator.MAX_FEEDBACK_LENGTH) {
            text = text.slice(0, DeploymentOrchestrator.MAX_FEEDBACK_LENGTH) + '\n... (truncated)';
        }

        return text;
    }
}
