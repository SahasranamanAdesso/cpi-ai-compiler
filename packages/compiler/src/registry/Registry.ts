import { ComponentRegistry, ComponentDefinition } from "./ComponentRegistry";

/**
 * Registry - Helper for looking up component definitions
 *
 * Provides a clean API for the compiler to query component metadata
 * without directly accessing the ComponentRegistry.
 *
 * Usage:
 *   const def = Registry.getByTechnicalName("Enricher");
 *   → { displayName: "Content Modifier", bpmnElement: "callActivity", ... }
 *
 *   const def = Registry.getByDisplayName("Content Modifier");
 *   → { displayName: "Content Modifier", bpmnElement: "callActivity", ... }
 */
export class Registry {

    /**
     * Look up a component definition by its SAP technical name
     *
     * This is the primary lookup method - technical names are stable
     * and match what's in exported .iflw files.
     *
     * @param technicalName - SAP technical name (e.g., "Enricher", "HTTPS")
     * @returns ComponentDefinition or undefined if not found
     *
     * @example
     * Registry.getByTechnicalName("Enricher")
     * → { displayName: "Content Modifier", bpmnElement: "callActivity", activityType: "Enricher" }
     */
    public static getByTechnicalName(technicalName: string): ComponentDefinition | undefined {
        return ComponentRegistry[technicalName];
    }

    /**
     * Look up a component definition by its display name
     *
     * Use this when accepting input from developers using friendly names.
     *
     * @param displayName - Friendly name (e.g., "Content Modifier", "HTTPS Adapter")
     * @returns ComponentDefinition or undefined if not found
     *
     * @example
     * Registry.getByDisplayName("Content Modifier")
     * → { displayName: "Content Modifier", bpmnElement: "callActivity", activityType: "Enricher" }
     */
    public static getByDisplayName(displayName: string): ComponentDefinition | undefined {
        return Object.values(ComponentRegistry).find(
            def => def.displayName === displayName
        );
    }

    /**
     * Get all registered component definitions
     *
     * @returns Array of all ComponentDefinitions
     */
    public static getAll(): ComponentDefinition[] {
        return Object.values(ComponentRegistry);
    }

    /**
     * Get all technical names (registry keys)
     *
     * @returns Array of technical names
     */
    public static getAllTechnicalNames(): string[] {
        return Object.keys(ComponentRegistry);
    }

}
