/**
 * Public API - Validation functions
 *
 * Validate IFlow models before compilation
 */

import { IFlow } from '../model/IFlow';
import { Router } from '../model/Router';
import { JdbcCall } from '../model/JdbcCall';
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
 *
 * Deliberately scoped to just these two adapters (not SOAP/SFTP/IDoc/OData)
 * -- this compiler has no reference evidence contradicting those adapters'
 * current versions, and "do not guess the XML structure" applies equally to
 * validation rules as it does to generation code.
 */
const KNOWN_ADAPTER_VERSIONS: Record<string, Partial<Record<'Sender' | 'Receiver', string>>> = {
    'HTTPS': { Sender: '1.5' },
    'HTTP': { Receiver: '1.16' },
    'JDBC': { Receiver: '1.5' }
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

        // NM-001/AD-007: mid-flow JDBC calls carry their own adapter (a
        // separate messageFlow, not part of flow.getSender()/getReceiver()),
        // so it needs the same check applied here.
        if (component instanceof JdbcCall) {
            checkAdapterOutput(component.adapter, 'Receiver', `JdbcCall "${component.id}"`, errors);
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
