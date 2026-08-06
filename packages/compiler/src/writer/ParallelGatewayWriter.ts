import { BpmnNode } from "../ir/BpmnNode";

/**
 * ParallelGatewayWriter - Writes BPMN <bpmn2:parallelGateway> element
 *
 * Generates XML for BPMN Parallel Gateway elements used for parallel processing (Multicast).
 *
 * In SAP Integration Suite, Parallel Gateways (Multicast components) split the
 * message flow into multiple branches where ALL branches execute simultaneously.
 *
 * SAP-COMPATIBLE METADATA (verified against IPRO_SRM_MM_MAIN export):
 * - Evidence: IPRO_SRM_MM_MAIN.iflw lines 1397-1421
 * - Required properties: activityType="Multicast", subActivityType="parallel",
 *   cmdVariantUri, componentVersion
 *
 * Difference from Exclusive Gateway:
 * - Exclusive (Router): ONE path chosen based on condition
 * - Parallel (Multicast): ALL paths execute in parallel
 *
 * Architecture:
 * - Input: BpmnNode with type="parallelGateway" and properties from Registry
 * - Output: BPMN XML with extensionElements + incoming/outgoing sequence flows
 * - Properties injected by ComponentMapper from ComponentRegistry
 *
 * Generated XML:
 * ```xml
 * <bpmn2:parallelGateway id="ParallelGateway_9238" name="Parallel Multicast 1">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>componentVersion</key>
 *       <value>1.1</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>activityType</key>
 *       <value>Multicast</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>cmdVariantUri</key>
 *       <value>ctype::FlowstepVariant/cname::Multicast/version::1.1.1</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>subActivityType</key>
 *       <value>parallel</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 *   <bpmn2:incoming>SequenceFlow_9281</bpmn2:incoming>
 *   <bpmn2:incoming>SequenceFlow_9280</bpmn2:incoming>
 *   <bpmn2:outgoing>SequenceFlow_9242</bpmn2:outgoing>
 *   <bpmn2:outgoing>SequenceFlow_9244</bpmn2:outgoing>
 *   <bpmn2:outgoing>SequenceFlow_9243</bpmn2:outgoing>
 * </bpmn2:parallelGateway>
 * ```
 */
export class ParallelGatewayWriter {

    /**
     * Writes a BPMN parallelGateway element with SAP extension metadata
     *
     * @param node - The BpmnNode representing this gateway (properties from ComponentMapper)
     * @param incoming - Array of incoming sequence flow IDs
     * @param outgoing - Array of outgoing sequence flow IDs
     * @returns BPMN XML string for this gateway
     *
     * Evidence: IPRO_SRM_MM_MAIN.iflw lines 1397-1421
     */
    write(node: BpmnNode, incoming: string[], outgoing: string[]): string {
        const lines: string[] = [];

        // Open parallelGateway element
        lines.push(`<bpmn2:parallelGateway id="${node.id}" name="${this.escape(node.name)}">`);

        // Add extensionElements with SAP metadata
        // Evidence: IPRO lines 1398-1415
        if (node.properties && Object.keys(node.properties).length > 0) {
            lines.push(`    <bpmn2:extensionElements>`);

            Object.entries(node.properties).forEach(([key, value]) => {
                lines.push(`        <ifl:property>`);
                lines.push(`            <key>${key}</key>`);
                lines.push(`            <value>${this.escape(String(value))}</value>`);
                lines.push(`        </ifl:property>`);
            });

            lines.push(`    </bpmn2:extensionElements>`);
        }

        // Add incoming flows
        incoming.forEach(flowId => {
            lines.push(`    <bpmn2:incoming>${flowId}</bpmn2:incoming>`);
        });

        // Add outgoing flows
        outgoing.forEach(flowId => {
            lines.push(`    <bpmn2:outgoing>${flowId}</bpmn2:outgoing>`);
        });

        // Close parallelGateway element
        lines.push(`</bpmn2:parallelGateway>`);

        return lines.join('\n');
    }

    /**
     * Escapes XML special characters in text content
     *
     * @param text - Text to escape
     * @returns Escaped text safe for XML attributes/content
     */
    private escape(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
