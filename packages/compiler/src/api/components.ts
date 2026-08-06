/**
 * Public API - Component metadata
 *
 * Query supported component types
 */

import { ComponentRegistry } from '../registry/ComponentRegistry';

/**
 * Get list of all supported SAP CPI component types
 *
 * Returns technical names of all components the compiler can handle.
 *
 * @returns Array of component type names
 *
 * @example
 * ```typescript
 * const components = supportedComponents();
 * console.log(components);
 * // ["Enricher", "Router", "ScriptCollection", "DBStorage", "Multicast", ...]
 * ```
 */
export function supportedComponents(): string[] {
    return Object.keys(ComponentRegistry);
}
