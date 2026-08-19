import { Component } from "./Component";

/**
 * Gather (Aggregator) - User-friendly API for SAP Gather component
 *
 * Gather is a processing component that aggregates multiple split messages
 * back into a single message, typically used after a Splitter component.
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="Gather">
 * - Aggregates messages based on correlation ID
 * - Supports multiple aggregation algorithms
 * - Can preserve or merge message structures
 *
 * Architecture:
 * - This class extends Component with Gather-specific defaults
 * - Registry metadata provides BPMN mapping and SAP properties
 * - Typically paired with Splitter in split-process-aggregate patterns
 *
 * SAP-compatible metadata (verified against POC.iflw export):
 * - Evidence: POC.iflw lines 1018-1055
 * - activityType: "Gather"
 * - componentVersion: "1.2"
 * - cmdVariantUri: ctype::FlowstepVariant/cname::Gather/version::1.2.0
 *
 * Common use cases:
 * - Aggregate split orders back into bulk response
 * - Collect results from parallel processing
 * - Merge fan-out processing results
 *
 * Example usage:
 * ```typescript
 * const gather = new Gather(
 *     "Gather Products",
 *     "sap-identical-multi-mapping",  // Aggregation algorithm
 *     { messageType: "SameXMLFormat" }
 * );
 * ```
 *
 * Generated BPMN:
 * ```xml
 * <bpmn2:callActivity id="Gather_1" name="Gather Products">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>activityType</key>
 *       <value>Gather</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>aggregationAlgorithm</key>
 *       <value>sap-identical-multi-mapping</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>messageType</key>
 *       <value>SameXMLFormat</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 * </bpmn2:callActivity>
 * ```
 */
export class Gather extends Component {

    /**
     * Creates a new Gather (Aggregator) component
     *
     * @param name - Human-readable name for this gather step
     * @param aggregationAlgorithm - Algorithm for aggregating messages (default: "sap-identical-multi-mapping")
     * @param additionalProperties - Optional additional SAP properties
     *
     * @example
     * ```typescript
     * // Basic gather with default algorithm
     * const gather = new Gather(
     *     "Gather Results",
     *     "sap-identical-multi-mapping"
     * );
     *
     * // Gather with custom message type
     * const gather = new Gather(
     *     "Gather Results",
     *     "sap-identical-multi-mapping",
     *     {
     *         messageType: "SameXMLFormat",
     *         targetXPath: "//Result",
     *         sourceXPath: "//Output"
     *     }
     * );
     *
     * // Custom aggregation with file names
     * const gather = new Gather(
     *     "Gather Files",
     *     "combine",
     *     {
     *         messageType: "PlainText",
     *         gatherFileNames: "true"
     *     }
     * );
     * ```
     *
     * @param id - Optional component ID (auto-generated if not provided)
     */
    constructor(
        name: string,
        aggregationAlgorithm: string = "sap-identical-multi-mapping",
        additionalProperties: Record<string, any> = {},
        id?: string
    ) {
        // Use provided ID or generate unique ID (same pattern as
        // ProcessCall/Router/GroovyScript -- see CP-001 fix history)
        const componentId = id || `Gather_${Date.now()}`;

        // Build properties with SAP-compatible keys
        // Evidence: POC.iflw lines 1020-1051
        const properties = {
            aggregationAlgorithm: aggregationAlgorithm,
            messageType: additionalProperties.messageType || "SameXMLFormat",
            ...additionalProperties
        };

        // Create Component with Gather type (registry key)
        // Registry metadata will inject: activityType="Gather",
        // cmdVariantUri, componentVersion, and default properties
        super(componentId, name, "Gather", properties);
    }

    /**
     * Gets the aggregation algorithm
     *
     * @returns The aggregation algorithm name
     */
    public getAggregationAlgorithm(): string {
        return this.properties.aggregationAlgorithm as string;
    }

    /**
     * Gets the message type
     *
     * @returns The message type ("SameXMLFormat", "PlainText", etc.)
     */
    public getMessageType(): string {
        return (this.properties.messageType as string) || "SameXMLFormat";
    }

    /**
     * Gets the target XPath (if configured)
     *
     * @returns The target XPath expression or empty string
     */
    public getTargetXPath(): string {
        return (this.properties.targetXPath as string) || "";
    }

    /**
     * Gets the source XPath (if configured)
     *
     * @returns The source XPath expression or empty string
     */
    public getSourceXPath(): string {
        return (this.properties.sourceXPath as string) || "";
    }
}
