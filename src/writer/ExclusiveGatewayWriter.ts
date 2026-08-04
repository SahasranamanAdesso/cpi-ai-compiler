import { BpmnNode } from "../ir/BpmnNode";

/**
 * ExclusiveGatewayWriter - Writes BPMN <bpmn2:exclusiveGateway> element
 *
 * Generates XML for BPMN Exclusive Gateway elements used for conditional routing.
 *
 * In SAP Integration Suite, Exclusive Gateways (Router components) split the
 * message flow into multiple conditional branches where exactly ONE branch is taken.
 *
 * SAP-COMPATIBLE METADATA (verified against IPRO_PRODUCT_HTTP export):
 * - Gateways REQUIRE extensionElements with SAP metadata
 * - Evidence: IPRO_PRODUCT_HTTP.iflw lines 932-955
 * - Required properties: activityType, cmdVariantUri, componentVersion, throwException
 * - Optional default attribute: specifies default route ID
 *
 * Architecture:
 * - Input: BpmnNode with type="exclusiveGateway" and properties from Registry
 * - Output: BPMN XML with extensionElements + incoming/outgoing sequence flows
 * - Properties injected by ComponentMapper from ComponentRegistry
 *
 * Generated XML:
 * ```xml
 * <bpmn2:exclusiveGateway default="SequenceFlow_9" id="Gateway_1" name="Route by Type">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>componentVersion</key>
 *       <value>1.1</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>activityType</key>
 *       <value>ExclusiveGateway</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>cmdVariantUri</key>
 *       <value>ctype::FlowstepVariant/cname::ExclusiveGateway/version::1.1.2</value>
 *     </ifl:property>
 *     <ifl:property>
 *       <key>throwException</key>
 *       <value>false</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 *   <bpmn2:incoming>SequenceFlow_1</bpmn2:incoming>
 *   <bpmn2:outgoing>SequenceFlow_2</bpmn2:outgoing>
 *   <bpmn2:outgoing>SequenceFlow_3</bpmn2:outgoing>
 * </bpmn2:exclusiveGateway>
 * ```
 */
export class ExclusiveGatewayWriter {

    /**
     * Writes a BPMN exclusiveGateway element with SAP extension metadata
     *
     * @param node - The BpmnNode representing this gateway (properties from ComponentMapper)
     * @param incoming - Array of incoming sequence flow IDs
     * @param outgoing - Array of outgoing sequence flow IDs
     * @param defaultRoute - Optional default route ID (for gateway's default attribute)
     * @returns BPMN XML string for this gateway
     *
     * Evidence: IPRO_PRODUCT_HTTP.iflw lines 932-955
     */
    write(node: BpmnNode, incoming: string[], outgoing: string[], defaultRoute?: string): string {
        const lines: string[] = [];

        // Build default attribute if specified
        // Evidence: SAP line 932 - default="SequenceFlow_9"
        const defaultAttr = defaultRoute ? ` default="${defaultRoute}"` : '';

        // Open exclusiveGateway element
        lines.push(`<bpmn2:exclusiveGateway${defaultAttr} id="${node.id}" name="${this.escape(node.name)}">`);

        // Add extensionElements with SAP metadata
        // Evidence: SAP lines 933-950
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

        // Close exclusiveGateway element
        lines.push(`</bpmn2:exclusiveGateway>`);

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
