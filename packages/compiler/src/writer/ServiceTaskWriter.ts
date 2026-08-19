import { BpmnNode } from "../ir/BpmnNode";
import { PropertyWriter } from "./PropertyWriter";

/**
 * ServiceTaskWriter - Writer for BPMN <bpmn2:serviceTask> XML
 *
 * SAP represents a mid-flow "external call" step (e.g. the request-reply
 * half of a JDBC call) as a <bpmn2:serviceTask activityType="ExternalCall">
 * rather than a <bpmn2:callActivity>. Structurally it is identical to
 * CallActivityWriter's output (extensionElements + incoming/outgoing), just
 * a different element name -- kept as its own writer to match this
 * compiler's one-writer-per-BPMN-element-type convention (see
 * ExclusiveGatewayWriter / ParallelGatewayWriter).
 *
 * Evidence: "Send Inbound Normal Orders from OCE to S4HANA.iflw",
 * ServiceTask_8 "RR_OCEDB" (activityType=ExternalCall, componentVersion=1.0,
 * cmdVariantUri=ctype::FlowstepVariant/cname::ExternalCall/version::1.0.4).
 */
export class ServiceTaskWriter {

    private propertyWriter = new PropertyWriter();

    write(
        node: BpmnNode,
        incoming: string[],
        outgoing: string[]
    ): string {
        const lines: string[] = [];

        lines.push(`<bpmn2:serviceTask id="${node.id}" name="${this.escape(node.name)}">`);

        lines.push(`    <bpmn2:extensionElements>`);

        Object.entries(node.properties).forEach(([key, value]) => {
            lines.push(`        <ifl:property>`);
            lines.push(`            <key>${key}</key>`);
            lines.push(`            <value>${this.escape(String(value))}</value>`);
            lines.push(`        </ifl:property>`);
        });

        lines.push(`    </bpmn2:extensionElements>`);

        incoming.forEach(flowId => {
            lines.push(`    <bpmn2:incoming>${flowId}</bpmn2:incoming>`);
        });

        outgoing.forEach(flowId => {
            lines.push(`    <bpmn2:outgoing>${flowId}</bpmn2:outgoing>`);
        });

        lines.push(`</bpmn2:serviceTask>`);

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
