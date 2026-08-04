import { Component } from "../model/Component";
import { Registry } from "../registry/Registry";
import { BpmnNode } from "../ir/BpmnNode";

/**
 * ComponentMapper - Translates CPI Components to BPMN Nodes
 *
 * This is the MAPPER layer in our compiler pipeline:
 *
 *   Component (Domain Model)
 *          ↓
 *   Registry (SAP Metadata)
 *          ↓
 *   ComponentMapper ← We are here
 *          ↓
 *   BpmnNode (IR)
 *
 * Responsibilities:
 * - Query Registry for component's BPMN mapping
 * - Create BpmnNode with correct BPMN element type
 * - Inject metadata (activityType) from Registry
 * - Preserve component properties
 *
 * Key Achievement:
 * - NO hardcoded component knowledge
 * - NO if/switch statements
 * - Pure translation using Registry metadata
 *
 * Example:
 *   Component("CMP_1", "Content Modifier", "Enricher")
 *        ↓
 *   Registry lookup: { bpmnElement: "callActivity", activityType: "Enricher" }
 *        ↓
 *   BpmnNode("CMP_1", "callActivity", "Content Modifier", { activityType: "Enricher" })
 */
export class ComponentMapper {

    /**
     * Maps a CPI Component to a BPMN Node
     *
     * This is pure translation - no business logic, just metadata lookup
     * and structure transformation.
     *
     * @param component - The CPI component to map
     * @returns BpmnNode ready for XML serialization
     * @throws Error if component type not found in Registry
     *
     * @example
     * const mapper = new ComponentMapper();
     * const node = mapper.map(
     *     new Component("CMP_1", "Content Modifier", "Enricher")
     * );
     * // → BpmnNode("CMP_1", "callActivity", "Content Modifier", {...})
     */
    public map(component: Component): BpmnNode {

        // Query Registry for BPMN mapping
        const definition = Registry.getByTechnicalName(component.componentType);

        if (!definition) {
            throw new Error(
                `Unsupported component: ${component.componentType}. ` +
                `Add it to ComponentRegistry.`
            );
        }

        // Build BPMN properties
        // Start with component's original properties
        const bpmnProperties = { ...component.properties };

        // Inject activityType if present in Registry definition
        if (definition.activityType) {
            bpmnProperties.activityType = definition.activityType;
        }

        // Inject metadata (if present)
        if (definition.metadata) {
            // Apply defaults first (user properties take precedence)
            if (definition.metadata.defaultProperties) {
                Object.entries(definition.metadata.defaultProperties).forEach(([key, value]) => {
                    if (!(key in bpmnProperties)) {
                        bpmnProperties[key] = value;
                    }
                });
            }

            // Inject cmdVariantUri and componentVersion from metadata
            // These are required SAP properties and always come from metadata
            bpmnProperties.cmdVariantUri = definition.metadata.cmdVariantUri;
            bpmnProperties.componentVersion = definition.metadata.componentVersion;

            // Inject optional SAP properties if present in metadata
            if (definition.metadata.operation) {
                bpmnProperties.operation = definition.metadata.operation;
            }

            // Groovy Script-specific properties (SAP requires these even if empty)
            // Evidence: IPRO_PRODUCT_HTTP.iflw lines 715-737
            if (definition.metadata.subActivityType) {
                bpmnProperties.subActivityType = definition.metadata.subActivityType;
            }
            if (definition.metadata.scriptFunction !== undefined) {
                bpmnProperties.scriptFunction = definition.metadata.scriptFunction;
            }
            if (definition.metadata.scriptBundleId !== undefined) {
                bpmnProperties.scriptBundleId = definition.metadata.scriptBundleId;
            }
        }

        // Create BpmnNode with BPMN element type from Registry
        return new BpmnNode(
            component.id,
            definition.bpmnElement,  // ← From Registry, not hardcoded
            component.name,
            bpmnProperties
        );
    }

    /**
     * Maps multiple components to BPMN nodes
     *
     * Convenience method for mapping arrays of components.
     *
     * @param components - Array of components to map
     * @returns Array of BpmnNodes
     */
    public mapAll(components: Component[]): BpmnNode[] {
        return components.map(component => this.map(component));
    }

}
