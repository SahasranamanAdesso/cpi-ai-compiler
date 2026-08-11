/**
 * Public API - Validation functions
 *
 * Validate IFlow models before compilation
 */

import { IFlow } from '../model/IFlow';
import { Router } from '../model/Router';

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
