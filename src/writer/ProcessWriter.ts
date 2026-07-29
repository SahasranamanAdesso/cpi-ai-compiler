import { BpmnProcess } from "../ir/BpmnProcess";
import { BpmnNode } from "../ir/BpmnNode";
import { BpmnSequenceFlow } from "../ir/BpmnSequenceFlow";
import { PropertyWriter } from "./PropertyWriter";
import { EventWriter } from "./EventWriter";
import { CallActivityWriter } from "./CallActivityWriter";
import { ExclusiveGatewayWriter } from "./ExclusiveGatewayWriter";

/**
 * ProcessWriter - Writes BPMN <bpmn2:process> element
 */
export class ProcessWriter {

    private propertyWriter = new PropertyWriter();
    private eventWriter = new EventWriter();
    private callActivityWriter = new CallActivityWriter();
    private exclusiveGatewayWriter = new ExclusiveGatewayWriter();

    write(process: BpmnProcess): string {
        const lines: string[] = [];

        lines.push(`<bpmn2:process id="${process.id}" name="${this.escape(process.name)}">`);

        // Extension elements (process-level properties)
        lines.push(`    <bpmn2:extensionElements>`);
        if (process.properties.length > 0) {
            lines.push(this.propertyWriter.writeAll(process.properties, "        "));
        } else {
            // Add default process properties
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>transactionTimeout</key>`);
            lines.push(`            <value>30</value>`);
            lines.push(`        </ifl:property>`);
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>componentVersion</key>`);
            lines.push(`            <value>1.2</value>`);
            lines.push(`        </ifl:property>`);
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>cmdVariantUri</key>`);
            lines.push(`            <value>ctype::FlowElementVariant/cname::IntegrationProcess/version::1.2.1</value>`);
            lines.push(`        </ifl:property>`);
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>transactionalHandling</key>`);
            lines.push(`            <value>Not Required</value>`);
            lines.push(`        </ifl:property>`);
        }
        lines.push(`    </bpmn2:extensionElements>`);

        // Build incoming/outgoing maps
        const incoming = new Map<string, string[]>();
        const outgoing = new Map<string, string[]>();

        process.flows.forEach(flow => {
            if (!outgoing.has(flow.sourceRef)) {
                outgoing.set(flow.sourceRef, []);
            }
            outgoing.get(flow.sourceRef)!.push(flow.id);

            if (!incoming.has(flow.targetRef)) {
                incoming.set(flow.targetRef, []);
            }
            incoming.get(flow.targetRef)!.push(flow.id);
        });

        // Write nodes
        process.nodes.forEach(node => {
            const nodeIncoming = incoming.get(node.id) || [];
            const nodeOutgoing = outgoing.get(node.id) || [];

            let nodeXml: string;

            if (node.type === "startEvent" || node.type === "endEvent") {
                nodeXml = this.eventWriter.write(node, nodeIncoming, nodeOutgoing);
            } else if (node.type === "callActivity") {
                nodeXml = this.callActivityWriter.write(node, nodeIncoming, nodeOutgoing);
            } else if (node.type === "exclusiveGateway") {
                nodeXml = this.exclusiveGatewayWriter.write(node, nodeIncoming, nodeOutgoing);
            } else {
                throw new Error(`Unsupported node type: ${node.type}`);
            }

            lines.push(this.indent(nodeXml, "    "));
        });

        // Write sequence flows
        process.flows.forEach(flow => {
            lines.push(this.writeSequenceFlow(flow));
        });

        lines.push(`</bpmn2:process>`);

        return lines.join('\n');
    }

    private writeSequenceFlow(flow: BpmnSequenceFlow): string {
        return `    <bpmn2:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"/>`;
    }

    private indent(text: string, indentStr: string): string {
        return text.split('\n').map(line => indentStr + line).join('\n');
    }

    private escape(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
