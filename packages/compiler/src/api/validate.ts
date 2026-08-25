/**
 * Public API - Validation functions
 *
 * Validate IFlow models before compilation
 */

import { IFlow } from '../model/IFlow';
import { Component } from '../model/Component';
import { Router } from '../model/Router';
import { JdbcCall } from '../model/JdbcCall';
import { ProcessDirectCall } from '../model/ProcessDirectCall';
import { ProcessCall } from '../model/ProcessCall';
import { isValidXmlNCName } from '../utils/XmlName';

/**
 * Known-good (ComponentType, direction) -> componentVersion combinations
 * this compiler is evidence-backed to generate, for the two adapters
 * directly implicated in real SAP Cloud Integration profile rejections
 * ("This component HTTPS with version 1.5 is not supported...", "This
 * component JDBC with version 1.5 is not supported..."):
 *   - HTTPS has no Receiver variant in the Cloud Integration profile catalog
 *     at all -- only Sender. An HTTPS Receiver is a bug (should be HTTP).
 *   - HTTP Receiver is version 1.16 (DISCOVERY_REPORT_PHASE3.md, real SAP
 *     export evidence), not 1.5/1.20.
 *   - JDBC Receiver is version 1.5, matching the reference JDBC export this
 *     compiler was built against.
 *   - Process Direct is version 1.1 for BOTH directions (two independent
 *     real exports agree) -- unlike JDBC/HTTP(S), Process Direct genuinely
 *     supports both Sender and Receiver.
 *   - RFC Receiver is version 1.2, matching rfc_reference.zip
 *     ("Send Quality Deviation from D3 to S4HANA.iflw").
 *   - JMS is version 1.3 for Sender / 1.5 for Receiver, matching
 *     jms_reference.zip ("Common Flow - Receive IDoc from SAP S4HANA.iflw")
 *     -- unlike Process Direct, JMS's two directions genuinely use
 *     DIFFERENT componentVersions (confirmed directly from evidence, not
 *     normalized to match each other).
 *   - AMQP Sender is version 1.7, matching amqp_reference.zip ("Send
 *     Outbound Batch Material Replication from S4HANA to D3.iflw") -- no
 *     Receiver entry, since no AMQP receiver is evidenced.
 *
 * Deliberately scoped to just these adapters (not SOAP/SFTP/IDoc/OData) --
 * this compiler has no reference evidence contradicting those adapters'
 * current versions, and "do not guess the XML structure" applies equally to
 * validation rules as it does to generation code.
 */
const KNOWN_ADAPTER_VERSIONS: Record<string, Partial<Record<'Sender' | 'Receiver', string>>> = {
    'HTTPS': { Sender: '1.5' },
    'HTTP': { Receiver: '1.16' },
    'JDBC': { Receiver: '1.5' },
    'ProcessDirect': { Sender: '1.1', Receiver: '1.1' },
    'RFC': { Receiver: '1.2' },
    'JMS': { Sender: '1.3', Receiver: '1.5' },
    'AMQP': { Sender: '1.7' }
};

/**
 * AD-006/AD-007/NM-001: checks one adapter's generated properties against
 * the invariants the compiler/package layer must guarantee regardless of
 * what the AI JSON asked for. `label` identifies the adapter's role in
 * error messages ("sender", "receiver", or a JdbcCall's component id).
 */
function checkAdapterOutput(adapter: any, direction: 'Sender' | 'Receiver', label: string, errors: ValidationError[], warnings: ValidationError[] = []): void {
    if (!adapter) {
        return;
    }

    // NM-001: the messageFlow "Channel Name" (adapter.name) must already be
    // a valid XML NCName by the time it reaches here -- HttpAdapter and
    // JdbcAdapter sanitize it at construction time, so this should never
    // fire in practice. It exists as a regression guard: if a future
    // change to those classes (or a hand-built IFlow bypassing them)
    // reintroduces an unsanitized display name, this catches it before
    // compileToZip() instead of silently shipping a broken .iflw.
    if (typeof adapter.name === 'string' && !isValidXmlNCName(adapter.name)) {
        errors.push({
            severity: 'error',
            code: 'NM-001',
            message: `${label} channel name "${adapter.name}" is not a valid XML NCName (no whitespace, must start with a letter or underscore)`
        });
    }

    // AD-006: HTTP(S) sender address must be a relative path.
    const componentType = adapter.properties?.ComponentType;
    if (direction === 'Sender' && (componentType === 'HTTP' || componentType === 'HTTPS')) {
        const address = adapter.properties?.urlPath;
        if (typeof address !== 'string' || !address.startsWith('/')) {
            errors.push({
                severity: 'error',
                code: 'AD-006',
                message: `${label} HTTP(S) address must be a relative path beginning with "/" (got: ${JSON.stringify(address)})`
            });
        }
    }

    // AD-009: Process Direct `address` must be a relative path beginning
    // with "/" -- required in BOTH directions (it's a pure routing key with
    // no host/scheme, and must match the target flow's Sender address
    // exactly). ProcessDirectAdapter already enforces this at construction
    // time, so this is a regression guard, same rationale as NM-001.
    if (componentType === 'ProcessDirect') {
        const address = adapter.properties?.address;
        if (typeof address !== 'string' || address.trim().length === 0 || !address.startsWith('/')) {
            errors.push({
                severity: 'error',
                code: 'AD-009',
                message: `${label} Process Direct address must be a relative path beginning with "/" (got: ${JSON.stringify(address)})`
            });
        }
    }

    // AD-010: RFC `destination` must be a non-empty string -- the RFC
    // adapter is meaningless without it (it names the RFC destination
    // configured in SAP Integration Suite's Connectivity Configuration).
    // RfcAdapter already enforces this at construction time, so this is a
    // regression guard, same rationale as NM-001/AD-009.
    if (componentType === 'RFC') {
        const destination = adapter.properties?.destination;
        if (typeof destination !== 'string' || destination.trim().length === 0) {
            errors.push({
                severity: 'error',
                code: 'AD-010',
                message: `${label} RFC destination must be a non-empty string (got: ${JSON.stringify(destination)})`
            });
        }
    }

    // AD-011: JMS queue name must be a non-empty string, checked under the
    // direction-specific property key evidence shows SAP actually uses
    // (`QueueName_inbound` for Sender, `QueueName_outbound` for Receiver --
    // these are genuinely different XML property keys, not just a naming
    // convention this compiler chose). JmsAdapter already enforces this at
    // construction time, so this is a regression guard, same rationale as
    // NM-001/AD-009/AD-010.
    if (componentType === 'JMS') {
        const queueKey = direction === 'Sender' ? 'QueueName_inbound' : 'QueueName_outbound';
        const queueName = adapter.properties?.[queueKey];
        if (typeof queueName !== 'string' || queueName.trim().length === 0) {
            errors.push({
                severity: 'error',
                code: 'AD-011',
                message: `${label} JMS ${queueKey} must be a non-empty string (got: ${JSON.stringify(queueName)})`
            });
        }
    }

    // AD-012: AMQP `destinationName` must be a non-empty string -- the
    // adapter is meaningless without it (it names the SAP Event Mesh
    // queue/topic to consume from). AmqpAdapter already enforces this at
    // construction time, so this is a regression guard, same rationale as
    // NM-001/AD-009/AD-010/AD-011.
    if (componentType === 'AMQP') {
        const destinationName = adapter.properties?.destinationName;
        if (typeof destinationName !== 'string' || destinationName.trim().length === 0) {
            errors.push({
                severity: 'error',
                code: 'AD-012',
                message: `${label} AMQP destinationName must be a non-empty string (got: ${JSON.stringify(destinationName)})`
            });
        }
    }

    // AD-008: HTTP receiver address. SAP's Address field reads
    // `httpAddressWithoutQuery`, not a single combined URL property --
    // evidence: V1.2.3a_ROUTER_VALIDATION_FIX.md ("HTTP adapter requires
    // httpAddressWithoutQuery to be configured"). A warning, not an error:
    // that same evidence documents SAP treating an unconfigured receiver
    // address as an acceptable "configure later" state for template flows,
    // not a structural failure -- so this must not flip validate() to
    // invalid for a flow that intentionally leaves the target dynamic.
    if (direction === 'Receiver' && componentType === 'HTTP') {
        const withoutQuery = adapter.properties?.httpAddressWithoutQuery;
        if (typeof withoutQuery !== 'string' || withoutQuery.trim().length === 0) {
            warnings.push({
                severity: 'warning',
                code: 'AD-008',
                message: `${label} HTTP receiver has no configured address (httpAddressWithoutQuery is empty) -- SAP will show "Enter a valid address" until this is configured, either here or later in SAP Integration Suite`
            });
        }
    }

    // AD-007: adapter/profile/version combination must match what this
    // compiler is evidence-backed to generate for Cloud Integration.
    if (componentType && componentType in KNOWN_ADAPTER_VERSIONS) {
        const expected = KNOWN_ADAPTER_VERSIONS[componentType][direction];
        const actual = adapter.properties?.componentVersion;
        if (expected === undefined) {
            errors.push({
                severity: 'error',
                code: 'AD-007',
                message: `${label}: component "${componentType}" has no known Cloud-Integration-compatible ${direction} variant`
            });
        } else if (actual !== expected) {
            errors.push({
                severity: 'error',
                code: 'AD-007',
                message: `${label}: component "${componentType}" (${direction}) has version "${actual}", expected "${expected}" for Cloud Integration profile compatibility`
            });
        }
    }
}

/**
 * Check if target is a valid flow endpoint (sender/receiver adapter)
 * that is actually configured in the flow
 */
function isFlowEndpoint(flow: IFlow, target: string): boolean {
    if (target === 'sender' && flow.getSender()) return true;
    if (target === 'receiver' && flow.getReceiver()) return true;
    return false;
}

/**
 * Validation error severity
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Validation error details
 */
export interface ValidationError {
    severity: ValidationSeverity;
    code: string;
    message: string;
    component?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
}

/**
 * Validate an IFlow model
 *
 * Checks structural integrity and SAP requirements before compilation.
 *
 * @param flow - IFlow model instance
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const flow = new IFlow("Test");
 * const result = validate(flow);
 *
 * if (!result.valid) {
 *     console.error("Validation errors:", result.errors);
 *     return;
 * }
 *
 * const zip = await compileToZip(flow);
 * ```
 */
export function validate(flow: IFlow): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // FL-001: Flow must have name
    if (!flow.name || flow.name.trim().length === 0) {
        errors.push({
            severity: 'error',
            code: 'FL-002',
            message: 'IFlow name is required'
        });
    }

    // FL-003: Exactly one sender
    const sender = flow.getSender();
    if (!sender) {
        errors.push({
            severity: 'error',
            code: 'FL-003',
            message: 'Flow must have exactly one sender adapter'
        });
    }

    // FL-004: At least one receiver
    const receiver = flow.getReceiver();
    if (!receiver) {
        errors.push({
            severity: 'error',
            code: 'FL-004',
            message: 'Flow must have at least one receiver adapter'
        });
    }

    // NM-001/AD-006/AD-007: check the final generated adapter output, not
    // just the AI JSON that produced it -- see checkAdapterOutput() doc.
    // This is what makes validate() actually protect the compiled ZIP
    // rather than just the shape of the input JSON (a "valid: true" result
    // that still produced a SAP-rejected ZIP was the reported problem).
    checkAdapterOutput(sender, 'Sender', 'sender', errors, warnings);
    checkAdapterOutput(receiver, 'Receiver', 'receiver', errors, warnings);

    // Component validation
    const components = flow.getComponents();
    const componentIds = new Set<string>();

    components.forEach(component => {
        // CP-001: Unique component IDs
        if (componentIds.has(component.id)) {
            errors.push({
                severity: 'error',
                code: 'CP-001',
                message: `Duplicate component ID: ${component.id}`,
                component: component.id
            });
        }
        componentIds.add(component.id);

        // CP-003: Component name required
        if (!component.name || component.name.trim().length === 0) {
            errors.push({
                severity: 'error',
                code: 'CP-003',
                message: 'Component name is required',
                component: component.id
            });
        }

        // NM-001/AD-007/AD-009: mid-flow adapter calls carry their own
        // adapter (a separate messageFlow, not part of
        // flow.getSender()/getReceiver()), so they need the same check
        // applied here.
        if (component instanceof JdbcCall) {
            checkAdapterOutput(component.adapter, 'Receiver', `JdbcCall "${component.id}"`, errors);
        } else if (component instanceof ProcessDirectCall) {
            checkAdapterOutput(component.adapter, 'Receiver', `ProcessDirectCall "${component.id}"`, errors);
        }

        // RT-002: Router must have at least 2 routes
        if (component instanceof Router) {
            const routes = component.getAllRoutes();
            if (routes.length < 2) {
                errors.push({
                    severity: 'error',
                    code: 'RT-002',
                    message: 'Router must have at least 2 routes (1 conditional + 1 default)',
                    component: component.id
                });
            }

            // RT-003: Router connections must match routes
            const connections = flow.getConnections();
            const routerConnections = connections.filter(c => c.from.id === component.id);
            const connectedComponents = new Set(routerConnections.map(c => c.to));

            // Validate each route target
            const routesNeedingConnections = routes.filter(r => {
                if (!r.target) return false;

                // 1. Resolve target through canonical component mapping
                const targetComponent = flow.resolveCanonicalId(r.target);

                if (targetComponent) {
                    // Case A: Target is a component
                    // Verify explicit router -> component connection exists
                    if (connectedComponents.has(targetComponent)) {
                        return false;  // Already connected
                    }
                    return true;  // Missing connection
                } else if (isFlowEndpoint(flow, r.target)) {
                    // Case B: Target is a configured flow endpoint (sender/receiver)
                    // No explicit component connection required
                    return false;
                } else {
                    // Case C: Unknown target
                    // Will fail during connection building when component not found
                    // For now, treat as not needing validation in RT-003
                    return false;
                }
            });

            if (routesNeedingConnections.length > 0) {
                // Build helpful error message using canonical IDs
                const missingTargets = routesNeedingConnections
                    .map(r => r.target)
                    .filter((t): t is string => t !== undefined);

                let message = `Router is missing connections to component targets: ${missingTargets.join(', ')}. `;
                message += `Add to connections array: ${missingTargets.map(t =>
                    `{"from": "<router-canonical-id>", "to": "${t}"}`).join(', ')}`;

                errors.push({
                    severity: 'error',
                    code: 'RT-003',
                    message,
                    component: component.id
                });
            }
        }
    });

    // PC-001 / LIP-001 / LIP-002: Local Integration Process wiring.
    //
    // Root cause of SAP's "The assigned Local Integration Process does not
    // exist": a ProcessCall's `processId` must equal the exact `id` of a
    // `<bpmn2:process>` element declared elsewhere in the same .iflw (see
    // BpmnProcessMapper.mapLocalIntegrationProcess() / ComponentFactory's
    // subProcesses handling). This was previously never checked -- a
    // ProcessCall with any string in `processId` passed validate() as
    // "valid: true" and only failed once imported into SAP.
    //
    // Checked across the WHOLE flow (main components, every subProcess's
    // own components, every exceptionSubprocess's own components) since
    // real SAP flows commonly place the ProcessCall inside an exception
    // subprocess rather than the main process -- evidence:
    // process_direct_reference.zip's CallActivity_45 lives inside
    // SubProcess_39 ("Exception Subprocess"), not Process_1 directly.
    const subProcesses = flow.getSubProcesses();
    const subProcessIds = new Set(subProcesses.map(sp => sp.id));

    const allComponents: Component[] = [
        ...components,
        ...subProcesses.flatMap(sp => sp.getComponents()),
        ...flow.getExceptionSubprocesses().flatMap(ex => ex.getComponents())
    ];

    allComponents.forEach(component => {
        if (component instanceof ProcessCall) {
            const targetId = component.getProcessId();
            if (!targetId || !subProcessIds.has(targetId)) {
                errors.push({
                    severity: 'error',
                    code: 'PC-001',
                    message: `ProcessCall "${component.id}" references Local Integration Process "${targetId}" which does not exist in this iFlow. Declare it via the top-level "subProcesses" array (with a matching "id" that this processId references) -- SAP will otherwise reject the flow with "The assigned Local Integration Process does not exist".`,
                    component: component.id
                });
            }
        }
    });

    // LIP-001: every Local Integration Process must have a valid XML NCName
    // id. Defensive backstop -- LocalIntegrationProcess always generates one
    // via IdGenerator or sanitizes an AI-supplied one, so this should be
    // unreachable via fromJson(); it exists for the same reason NM-001 does
    // (hand-built IFlow usage, or a future regression, shouldn't ship
    // silently).
    subProcesses.forEach(sp => {
        if (!sp.id || !isValidXmlNCName(sp.id)) {
            errors.push({
                severity: 'error',
                code: 'LIP-001',
                message: `Local Integration Process "${sp.name}" has an invalid id (${JSON.stringify(sp.id)}) -- must be a valid XML NCName.`
            });
        }
    });

    // LIP-002: Local Integration Process ids must be unique. Defensive
    // backstop for hand-built IFlow usage outside fromJson() (which already
    // dedupes AI-supplied subProcess ids via ensureUniqueTechnicalName
    // before this point is ever reached).
    const seenSubProcessIds = new Set<string>();
    subProcesses.forEach(sp => {
        if (seenSubProcessIds.has(sp.id)) {
            errors.push({
                severity: 'error',
                code: 'LIP-002',
                message: `Duplicate Local Integration Process id: ${sp.id}`
            });
        }
        seenSubProcessIds.add(sp.id);
    });

    // Resource validation
    const resources = flow.getResources();
    const resourceNames = new Set(resources.map(r => r.name));

    // Check for orphaned components (not connected)
    if (components.length > 0) {
        const connections = flow.getConnections();
        const connectedIds = new Set<string>();
        connections.forEach(c => {
            connectedIds.add(c.from.id);
            connectedIds.add(c.to.id);
        });

        // For flows with sender/receiver but no explicit connections,
        // all components are implicitly connected through the flow entry/exit points
        const hasSender = !!flow.getSender();
        const hasReceiver = !!flow.getReceiver();
        const hasExplicitConnections = connections.length > 0;

        components.forEach(component => {
            // A component is connected if:
            // 1. It appears in explicit connections, OR
            // 2. It's in a flow with sender/receiver (implicit connection)
            const isExplicitlyConnected = connectedIds.has(component.id);
            const isImplicitlyConnected = hasSender && hasReceiver && !hasExplicitConnections;

            if (!isExplicitlyConnected && !isImplicitlyConnected) {
                warnings.push({
                    severity: 'warning',
                    code: 'CN-003',
                    message: 'Component is not connected to flow',
                    component: component.id
                });
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
