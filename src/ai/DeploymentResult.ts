import { GenerationResult } from './GenerationResult';
import { DeployResult } from './Deployer';

/**
 * One iteration of DeploymentOrchestrator's deploy-retry loop.
 */
export interface DeploymentAttempt {
    /** 1-based attempt number */
    attemptNumber: number;

    /** AI generation result for this attempt */
    generationResult?: GenerationResult;

    /** Local/packaging errors; empty if generation succeeded */
    generationErrors: string[];

    /** Flow name produced this attempt, if generation succeeded */
    flowName?: string;

    /** Deployment outcome; undefined if generation failed this attempt (deploy was never called) */
    deployResult?: DeployResult;

    /** Raw structured error payload from Deployer.getArtifactError(), when fetched */
    sapErrorDetail?: unknown;

    /** Feedback text appended to the next attempt's request; undefined on the final/successful attempt */
    feedbackGiven?: string;
}

/**
 * Result of DeploymentOrchestrator.deployWithRetry(...)
 */
export interface DeploymentResult {
    /** True iff some attempt reached deployment status 'STARTED' */
    success: boolean;

    /** Terminal deployment status of the last attempt, if one was made */
    finalStatus?: 'STARTED' | 'ERROR' | 'TIMEOUT';

    /** Full history of every attempt made */
    attempts: DeploymentAttempt[];

    /** Path to the last-generated .zip file (kept regardless of outcome, for inspection) */
    outputPath?: string;

    /** Name of the successfully deployed flow, if success */
    flowName?: string;

    /** Total elapsed time in milliseconds across all attempts */
    elapsedMs: number;
}
