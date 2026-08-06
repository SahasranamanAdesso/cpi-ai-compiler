import { BpmnNode } from "../ir/BpmnNode";

/**
 * EventWriter - Writes BPMN events (start, end) with bpmn2 prefix
 */
export class EventWriter {

    write(
        node: BpmnNode,
        incoming: string[],
        outgoing: string[]
    ): string {
        const lines: string[] = [];

        lines.push(`<bpmn2:${node.type} id="${node.id}" name="${this.escape(node.name)}">`);

        // Extension elements with properties
        lines.push(`    <bpmn2:extensionElements>`);
        if (node.iflProperties.length > 0) {
            node.iflProperties.forEach(prop => {
                lines.push(`        <ifl:property>`);
                lines.push(`            <key>${this.escape(prop.key)}</key>`);
                lines.push(`            <value>${this.escape(prop.value)}</value>`);
                lines.push(`        </ifl:property>`);
            });
        } else {
            // Add default componentVersion and cmdVariantUri
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>componentVersion</key>`);
            if (node.type === "startEvent") {
                lines.push(`            <value>1.0</value>`);
            } else {
                lines.push(`            <value>1.1</value>`);
            }
            lines.push(`        </ifl:property>`);
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>cmdVariantUri</key>`);
            if (node.type === "startEvent") {
                lines.push(`            <value>ctype::FlowstepVariant/cname::MessageStartEvent/version::1.0</value>`);
            } else {
                lines.push(`            <value>ctype::FlowstepVariant/cname::MessageEndEvent/version::1.1.0</value>`);
            }
            lines.push(`        </ifl:property>`);
        }
        lines.push(`    </bpmn2:extensionElements>`);

        incoming.forEach(flowId => {
            lines.push(`    <bpmn2:incoming>${flowId}</bpmn2:incoming>`);
        });

        outgoing.forEach(flowId => {
            lines.push(`    <bpmn2:outgoing>${flowId}</bpmn2:outgoing>`);
        });

        // Add messageEventDefinition for start/end events
        lines.push(`    <bpmn2:messageEventDefinition/>`);

        lines.push(`</bpmn2:${node.type}>`);

        return lines.join('\n');
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
