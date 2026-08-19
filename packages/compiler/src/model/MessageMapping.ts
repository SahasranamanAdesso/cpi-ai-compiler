import { Component } from "./Component";

/**
 * MessageMapping - User-friendly API for SAP Message Mapping component
 *
 * Message Mapping is a processing component that transforms message structures
 * using graphical mapping definitions (.mmap files).
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="Mapping">
 * - References external .mmap file in mapping/ directory
 * - Supports XSLT, Java, and graphical transformations
 * - Can map between different message formats
 *
 * Architecture:
 * - This class extends Component with MessageMapping-specific defaults
 * - Registry metadata provides BPMN mapping and SAP properties
 * - Requires corresponding MappingResource to be added to IFlow
 *
 * SAP-compatible metadata (verified against POC.iflw export):
 * - Evidence: POC.iflw lines 1136-1181
 * - activityType: "Mapping"
 * - componentVersion: "1.3"
 * - cmdVariantUri: ctype::FlowstepVariant/cname::MessageMapping/version::1.3.1
 * - mappingType: "MessageMapping"
 *
 * Common use cases:
 * - Transform SAP IDoc to REST JSON
 * - Convert order XML to invoice XML
 * - Map between different XSD schemas
 *
 * Example usage:
 * ```typescript
 * // Create mapping resource
 * const mappingFile = new MappingResource(
 *     "Order_to_Invoice.mmap",
 *     mappingContent
 * );
 *
 * // Create mapping component
 * const mapping = new MessageMapping(
 *     "Transform to Invoice",
 *     "Order_to_Invoice.mmap"
 * );
 *
 * // Add both to flow
 * flow.addResource(mappingFile);
 * flow.addComponent(mapping);
 * ```
 *
 * Generated BPMN:
 * ```xml
 * <bpmn2:callActivity id="Mapping_1" name="Transform to Invoice">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>activityType</key>
 *       <value>Mapping</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>mappingType</key>
 *       <value>MessageMapping</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>mappingname</key>
 *       <value>Order_to_Invoice</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>mappingpath</key>
 *       <value>src/main/resources/mapping/Order_to_Invoice</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 * </bpmn2:callActivity>
 * ```
 */
export class MessageMapping extends Component {

    /**
     * Creates a new Message Mapping component
     *
     * @param name - Human-readable name for this mapping step
     * @param mappingName - Filename of the .mmap file (e.g., "Order_to_Invoice.mmap")
     * @param additionalProperties - Optional additional SAP properties
     *
     * @example
     * ```typescript
     * // Basic usage
     * const mapping = new MessageMapping(
     *     "Transform Order",
     *     "Order_to_Invoice.mmap"
     * );
     *
     * // With dynamic mapping reference
     * const mapping = new MessageMapping(
     *     "Dynamic Transform",
     *     "Dynamic_Mapping.mmap",
     *     {
     *         mappingReference: "dynamic",
     *         mappingSourceValue: "${header.mappingName}"
     *     }
     * );
     * ```
     *
     * @param id - Optional component ID (auto-generated if not provided)
     */
    constructor(
        name: string,
        mappingName: string,
        additionalProperties: Record<string, any> = {},
        id?: string
    ) {
        // Use provided ID or generate unique ID (same pattern as
        // ProcessCall/Router/GroovyScript -- see CP-001 fix history)
        const componentId = id || `Mapping_${Date.now()}`;

        // Extract base name (remove .mmap extension)
        const baseName = mappingName.replace('.mmap', '');

        // Build properties with SAP-compatible keys
        // Evidence: POC.iflw lines 1138-1177
        const properties = {
            mappingType: "MessageMapping",
            mappingReference: "static",  // "static" | "dynamic"
            mappingname: baseName,
            mappingpath: `src/main/resources/mapping/${baseName}`,
            mappinguri: `dir://mmap/src/main/resources/mapping/${mappingName}`,
            mappingSourceValue: "",
            messageMappingBundleId: "",
            ...additionalProperties
        };

        // Create Component with MessageMapping type (registry key)
        // Registry metadata will inject: activityType="Mapping",
        // cmdVariantUri, componentVersion
        super(componentId, name, "MessageMapping", properties);
    }

    /**
     * Gets the mapping name (without extension)
     *
     * @returns The mapping base name (e.g., "Order_to_Invoice")
     */
    public getMappingName(): string {
        return this.properties.mappingname as string;
    }

    /**
     * Gets the mapping path
     *
     * @returns The mapping path (e.g., "src/main/resources/mapping/Order_to_Invoice")
     */
    public getMappingPath(): string {
        return this.properties.mappingpath as string;
    }

    /**
     * Gets the mapping URI
     *
     * @returns The mapping URI (e.g., "dir://mmap/src/main/resources/mapping/Order_to_Invoice.mmap")
     */
    public getMappingUri(): string {
        return this.properties.mappinguri as string;
    }

    /**
     * Gets the mapping type
     *
     * @returns The mapping type (typically "MessageMapping")
     */
    public getMappingType(): string {
        return this.properties.mappingType as string;
    }

    /**
     * Checks if this is a dynamic mapping reference
     *
     * @returns True if mapping reference is dynamic
     */
    public isDynamicMapping(): boolean {
        return this.properties.mappingReference === "dynamic";
    }
}
