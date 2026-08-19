import { BpmnProcess } from "../ir/BpmnProcess";
import { BpmnNode } from "../ir/BpmnNode";
import { BpmnSequenceFlow } from "../ir/BpmnSequenceFlow";
import { PropertyWriter } from "./PropertyWriter";
import { EventWriter } from "./EventWriter";
import { CallActivityWriter } from "./CallActivityWriter";
import { ExclusiveGatewayWriter } from "./ExclusiveGatewayWriter";
import { ParallelGatewayWriter } from "./ParallelGatewayWriter";
import { ServiceTaskWriter } from "./ServiceTaskWriter";

/**
 * ProcessWriter - Writes BPMN <bpmn2:process> element
 */
export class ProcessWriter {

    private propertyWriter = new PropertyWriter();
    private eventWriter = new EventWriter();
    private callActivityWriter = new CallActivityWriter();
    private exclusiveGatewayWriter = new ExclusiveGatewayWriter();
    private parallelGatewayWriter = new ParallelGatewayWriter();
    private serviceTaskWriter = new ServiceTaskWriter();

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
            } else if (node.type === "serviceTask") {
                nodeXml = this.serviceTaskWriter.write(node, nodeIncoming, nodeOutgoing);
            } else if (node.type === "exclusiveGateway") {
                // Find default route for this gateway
                // Default route is the one WITHOUT a condition expression
                // Evidence: IPRO_PRODUCT_HTTP.iflw line 981-996 (default route has no conditionExpression)
                const defaultRouteId = this.findDefaultRoute(process, node.id);
                nodeXml = this.exclusiveGatewayWriter.write(node, nodeIncoming, nodeOutgoing, defaultRouteId);
            } else if (node.type === "parallelGateway") {
                // Parallel Gateway (Multicast) - no default route, all branches execute
                // Evidence: IPRO_SRM_MM_MAIN.iflw lines 1397-1421
                nodeXml = this.parallelGatewayWriter.write(node, nodeIncoming, nodeOutgoing);
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

    /**
     * Writes a BPMN sequenceFlow element with optional SAP gateway route metadata
     *
     * Simple flow (no metadata):
     * <sequenceFlow id="..." sourceRef="..." targetRef="..."/>
     *
     * Gateway route with condition (SAP-compatible):
     * <sequenceFlow id="..." name="POST" sourceRef="..." targetRef="...">
     *   <extensionElements>
     *     <ifl:property><key>expressionType</key><value>NonXML</value></ifl:property>
     *     <ifl:property><key>componentVersion</key><value>1.0</value></ifl:property>
     *     <ifl:property><key>cmdVariantUri</key><value>ctype::FlowstepVariant/cname::GatewayRoute/version::1.0.0</value></ifl:property>
     *   </extensionElements>
     *   <conditionExpression id="..." xsi:type="bpmn2:tFormalExpression">${condition}</conditionExpression>
     * </sequenceFlow>
     *
     * Evidence: IPRO_PRODUCT_HTTP.iflw lines 964-1013
     */
    private writeSequenceFlow(flow: BpmnSequenceFlow): string {
        // Check if this is a simple flow (no name, no condition, no properties)
        const isSimpleFlow = !flow.name && !flow.condition && Object.keys(flow.properties).length === 0;

        if (isSimpleFlow) {
            // Simple flow - single line
            return `    <bpmn2:sequenceFlow id="${flow.id}" sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}"/>`;
        }

        // Complex flow (gateway route) - multi-line with metadata
        const lines: string[] = [];

        // Build name attribute if present
        const nameAttr = flow.name ? ` name="${this.escape(flow.name)}"` : '';

        // Opening tag
        lines.push(`    <bpmn2:sequenceFlow id="${flow.id}"${nameAttr} sourceRef="${flow.sourceRef}" targetRef="${flow.targetRef}">`);

        // Add extensionElements if properties exist
        if (Object.keys(flow.properties).length > 0) {
            lines.push(`        <bpmn2:extensionElements>`);

            Object.entries(flow.properties).forEach(([key, value]) => {
                lines.push(`            <ifl:property>`);
                lines.push(`                <key>${key}</key>`);
                lines.push(`                <value>${this.escape(value)}</value>`);
                lines.push(`            </ifl:property>`);
            });

            lines.push(`        </bpmn2:extensionElements>`);
        }

        // Add conditionExpression if present
        // Evidence: SAP line 979 - conditionExpression with unique ID
        if (flow.condition) {
            const exprId = `FormalExpression_${flow.id}_${Date.now()}`;
            lines.push(`        <bpmn2:conditionExpression id="${exprId}" xsi:type="bpmn2:tFormalExpression">${this.escape(flow.condition)}</bpmn2:conditionExpression>`);
        }

        // Closing tag
        lines.push(`    </bpmn2:sequenceFlow>`);

        return lines.join('\n');
    }

    /**
     * Finds the default route ID for an exclusive gateway
     *
     * The default route is identified by having NO conditionExpression
     * Evidence: IPRO_PRODUCT_HTTP.iflw lines 981-996
     *
     * @param process - The BPMN process containing the flows
     * @param gatewayId - The gateway node ID
     * @returns The sequence flow ID of the default route, or undefined
     */
    private findDefaultRoute(process: BpmnProcess, gatewayId: string): string | undefined {
        // Find all flows from this gateway
        const gatewayFlows = process.flows.filter(flow => flow.sourceRef === gatewayId);

        // Default route is the one without a condition
        const defaultFlow = gatewayFlows.find(flow => !flow.condition);

        return defaultFlow?.id;
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
