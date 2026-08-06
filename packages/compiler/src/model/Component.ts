/**
 * Component - Generic representation of any CPI integration component
 *
 * This is the Internal Representation (IR) that the compiler works with.
 * Instead of having 50 different classes (SenderNode, ReceiverNode, etc.),
 * we use a single metadata-driven Component class.
 *
 * Every CPI component, regardless of type, has:
 *   - An ID (unique identifier)
 *   - A Name (human-readable)
 *   - A ComponentType (determines BPMN representation)
 *   - Properties (adapter-specific configuration)
 *
 * Examples:
 *
 * Content Modifier:
 *   new Component("CMP_1", "Set Country", "Enricher", {
 *       headers: { Country: "IN" }
 *   })
 *
 * Router:
 *   new Component("CMP_2", "Route by Country", "Router", {
 *       condition: "${header.Country} == 'IN'"
 *   })
 *
 * Groovy Script:
 *   new Component("CMP_3", "Transform", "GroovyScript", {
 *       script: "transform.groovy"
 *   })
 *
 * This design makes the SDK future-proof. When SAP introduces a new adapter,
 * we don't need to create new classes - just use the same Component with
 * a different componentType.
 *
 * This follows the CAP model:
 *   entity Employee → metadata → compiler → SQL
 *   IFlowDefinition → Component → compiler → BPMN
 */
export class Component {
    /**
     * Creates a new Component
     * @param id - Unique identifier (e.g., "CMP_1", "Router_1")
     * @param name - Human-readable name
     * @param componentType - Type that determines BPMN mapping (e.g., "Enricher", "Router", "GroovyScript")
     * @param properties - Component-specific configuration
     */
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly componentType: string,
        public readonly properties: Record<string, any> = {}
    ) {}
}
