import { Component } from "./Component";

/**
 * Splitter (GeneralSplitter) - User-friendly API for SAP General Splitter component
 *
 * General Splitter is a processing component that splits a single message containing
 * multiple items into individual messages, enabling parallel or sequential processing.
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="Splitter">
 * - Uses XPath or token-based expression to identify split points
 * - Supports streaming for large messages
 * - Configurable parallel processing and threading
 *
 * Architecture:
 * - This class extends Component with Splitter-specific defaults
 * - Registry metadata provides BPMN mapping and SAP properties
 * - Typically paired with Gather component to aggregate results
 *
 * SAP-compatible metadata (verified against POC.iflw export):
 * - Evidence: POC.iflw lines 1082-1135
 * - activityType: "Splitter"
 * - componentVersion: "1.6"
 * - cmdVariantUri: ctype::FlowstepVariant/cname::GeneralSplitter/version::1.6.0
 * - splitType: "GeneralSplitter"
 *
 * Common use cases:
 * - Split bulk order file into individual orders
 * - Process array of items in parallel
 * - Fan-out pattern for distributing work
 *
 * Example usage:
 * ```typescript
 * const splitter = new Splitter(
 *     "Split Products",
 *     "/Products/Product",  // XPath expression
 *     { ParallelProcessing: "true", SplitterThreads: "5" }
 * );
 * ```
 *
 * Generated BPMN:
 * ```xml
 * <bpmn2:callActivity id="Splitter_1" name="Split Products">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>activityType</key>
 *       <value>Splitter</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>splitExprValue</key>
 *       <value>/Products/Product</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>exprType</key>
 *       <value>XPath</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 * </bpmn2:callActivity>
 * ```
 */
export class Splitter extends Component {

    /**
     * Creates a new General Splitter component
     *
     * @param name - Human-readable name for this splitter step
     * @param splitExpression - XPath or token expression defining split points
     * @param additionalProperties - Optional additional SAP properties
     *
     * @example
     * ```typescript
     * // Basic XPath splitter (sequential processing)
     * const splitter = new Splitter(
     *     "Split Orders",
     *     "/Orders/Order"
     * );
     *
     * // Parallel processing with 10 threads
     * const splitter = new Splitter(
     *     "Split Orders",
     *     "/Orders/Order",
     *     {
     *         ParallelProcessing: "true",
     *         SplitterThreads: "10",
     *         Streaming: "true"
     *     }
     * );
     *
     * // Token-based splitter
     * const splitter = new Splitter(
     *     "Split CSV Lines",
     *     "\n",  // Split on newline
     *     {
     *         exprType: "Token",
     *         grouping: "1"  // Group every 1 line
     *     }
     * );
     * ```
     */
    constructor(
        name: string,
        splitExpression: string,
        additionalProperties: Record<string, any> = {}
    ) {
        // Generate unique ID for this component
        const id = `Splitter_${Date.now()}`;

        // Determine expression type from additional properties or default to XPath
        const exprType = additionalProperties.exprType || "XPath";

        // Build properties with SAP-compatible keys
        // Evidence: POC.iflw lines 1084-1131
        const properties = {
            splitExprValue: splitExpression,
            exprType: exprType,
            splitType: "GeneralSplitter",
            ...additionalProperties
        };

        // Create Component with GeneralSplitter type (registry key)
        // Registry metadata will inject: activityType="Splitter",
        // cmdVariantUri, componentVersion, and default properties
        super(id, name, "GeneralSplitter", properties);
    }

    /**
     * Gets the split expression
     *
     * @returns The XPath or token expression used for splitting
     */
    public getSplitExpression(): string {
        return this.properties.splitExprValue as string;
    }

    /**
     * Gets the expression type
     *
     * @returns The expression type ("XPath" or "Token")
     */
    public getExpressionType(): string {
        return (this.properties.exprType as string) || "XPath";
    }

    /**
     * Checks if parallel processing is enabled
     *
     * @returns True if parallel processing is enabled
     */
    public isParallelProcessing(): boolean {
        return this.properties.ParallelProcessing === "true";
    }

    /**
     * Gets the number of splitter threads
     *
     * @returns The number of threads for parallel processing
     */
    public getSplitterThreads(): number {
        return parseInt(this.properties.SplitterThreads as string) || 10;
    }
}
