import { BpmnNode } from "../ir/BpmnNode";

/**
 * ExclusiveGatewayWriter - Writes BPMN <bpmn2:exclusiveGateway> element
 *
 * Generates XML for BPMN Exclusive Gateway elements used for conditional routing.
 *
 * In SAP Integration Suite, Exclusive Gateways (Router components) split the
 * message flow into multiple conditional branches where exactly ONE branch is taken.
 *
 * Unlike CallActivity-based components, Gateways are pure BPMN constructs
 * without SAP-specific metadata (no activityType, cmdVariantUri, etc.).
 *
 * Architecture:
 * - Input: BpmnNode with type="exclusiveGateway"
 * - Output: BPMN XML with incoming/outgoing sequence flows
 * - No extension elements (gateways don't use ifl:property)
 *
 * Generated XML:
 * ```xml
 * <bpmn2:exclusiveGateway id="Gateway_1" name="Route by Type">
 *   <bpmn2:incoming>SequenceFlow_1</bpmn2:incoming>
 *   <bpmn2:outgoing>SequenceFlow_2</bpmn2:outgoing>
 *   <bpmn2:outgoing>SequenceFlow_3</bpmn2:outgoing>
 * </bpmn2:exclusiveGateway>
 * ```
 *
 * Note: Routing conditions are defined on sequenceFlow elements, not on the gateway itself.
 */
export class ExclusiveGatewayWriter {

    /**
     * Writes a BPMN exclusiveGateway element
     *
     * @param node - The BpmnNode representing this gateway
     * @param incoming - Array of incoming sequence flow IDs
     * @param outgoing - Array of outgoing sequence flow IDs
     * @returns BPMN XML string for this gateway
     */
    write(node: BpmnNode, incoming: string[], outgoing: string[]): string {
        const lines: string[] = [];

        // Open exclusiveGateway element
        lines.push(`<bpmn2:exclusiveGateway id="${node.id}" name="${this.escape(node.name)}">`);

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
