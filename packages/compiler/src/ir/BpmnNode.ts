import { IflProperty } from "./IflProperty";

/**
 * BpmnNode - Intermediate Representation of a BPMN element
 *
 * This represents any BPMN node (start event, end event, task, gateway, etc.)
 * in a language-neutral way before XML serialization.
 *
 * Every BPMN element has:
 * - id: Unique identifier (e.g., "StartEvent_1", "CallActivity_1")
 * - type: BPMN element type (e.g., "startEvent", "callActivity", "exclusiveGateway")
 * - name: Human-readable label shown in CPI
 * - properties: Element-specific configuration
 *
 * Examples:
 *
 * Start Event:
 *   new BpmnNode("StartEvent_1", "startEvent", "Start")
 *
 * Content Modifier (callActivity):
 *   new BpmnNode("CallActivity_1", "callActivity", "Set Headers", {
 *       activityType: "Enricher",
 *       headers: { Country: "IN" }
 *   })
 *
 * Router (exclusiveGateway):
 *   new BpmnNode("Gateway_1", "exclusiveGateway", "Route by Country", {
 *       condition: "${header.Country} == 'IN'"
 *   })
 */
export class BpmnNode {
    public readonly iflProperties: IflProperty[] = [];

    constructor(
        public readonly id: string,
        public readonly type: string,
        public readonly name: string,
        public readonly properties: Record<string, any> = {}
    ) {}

    addProperty(key: string, value: string): void {
        this.iflProperties.push(new IflProperty(key, value));
    }
}
