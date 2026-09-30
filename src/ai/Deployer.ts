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
