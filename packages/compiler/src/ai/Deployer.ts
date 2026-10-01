/**
 * Deployer - Structural interface for SAP Integration Suite deployment clients
 *
 * This interface abstracts the deployment target (SAP Integration Suite via
 * the Integration Runtime OData API) so the compiler has NO runtime/npm
 * dependency on any concrete deployer package. Any object satisfying this
 * shape can be injected into a DeploymentOrchestrator - including a real
 * `CpiDeployer` from `@david10ten/deployer`, which matches this shape
 * without any import needed (duck typing).
 *
 * Implementations are responsible ONLY for:
 * - Creating/updating and deploying a designtime artifact from a base64 ZIP
 * - Polling runtime status until a terminal state is reached
 * - Fetching structured deployment-error detail for a failed artifact
 *
 * Implementations must NOT:
 * - Generate TypeScript, XML, BPMN, or ZIP files
 * - Decide retry/regeneration policy (that's DeploymentOrchestrator's job)
 *
 * @example
 * // A real CpiDeployer instance satisfies this interface structurally,
 * // with no import of this file required by the deployer package:
 * const deployer: Deployer = new CpiDeployer({ credentials: { ... } });
 */
export interface DeployZipParams {
    id: string;
    name: string;
    packageId: string;
    /** Base64-encoded iFlow ZIP content */
    zipBase64: string;
}

export interface DeployPollOptions {
    timeoutMs?: number;
    intervalMs?: number;
}

export interface DeployResult {
    status: 'STARTED' | 'ERROR' | 'TIMEOUT';
    raw?: unknown;
}

export interface Deployer {
    /**
     * Create/update the designtime artifact, deploy it, and poll until a
     * terminal runtime status is reached.
     */
    deployZip(params: DeployZipParams, pollOptions?: DeployPollOptions): Promise<DeployResult>;

    /**
     * Get the structured deployment-error detail for one artifact.
     * Resolves `null` when the tenant has no structured detail available.
     */
    getArtifactError(id: string): Promise<unknown | null>;
}

const MAX_FEEDBACK_LENGTH = 4000;

/**
 * Formats a Deployer error result (a DeployResult's terminal status plus,
 * for ERROR, the raw payload from Deployer.getArtifactError()) into
 * natural-language feedback suitable for the next AI generation attempt.
 *
 * Used internally by DeploymentOrchestrator between retry attempts, and
 * exported standalone so callers who already have SAP error detail from
 * elsewhere (e.g. syncing the status of a flow deployed outside this
 * pipeline) can produce the same feedback text without going through a
 * generate+deploy cycle.
 *
 * This is a seam for a future MessageProcessingLogs fallback (when
 * getArtifactError resolves null on tenants that don't populate it) - out
 * of scope for v1.
 */
export function formatSapErrorFeedback(status: 'ERROR' | 'TIMEOUT', detail: unknown): string {
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

    if (text.length > MAX_FEEDBACK_LENGTH) {
        text = text.slice(0, MAX_FEEDBACK_LENGTH) + '\n... (truncated)';
    }

    return text;
}
