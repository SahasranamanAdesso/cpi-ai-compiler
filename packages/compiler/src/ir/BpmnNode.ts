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

    /**
     * @param isMessageEvent - Only meaningful for type "startEvent"/"endEvent".
     *   Defaults to true (existing behavior, unchanged): the main Integration
     *   Process's start/end events are triggered by an adapter message and
     *   carry a `<bpmn2:messageEventDefinition/>`. A Local Integration
     *   Process's internal start/end events are plain (invoked via
     *   ProcessCall, not by a message) and must NOT carry one -- evidence:
     *   process_direct_reference.zip, StartEvent_50/EndEvent_51 inside
     *   Process_49 (`cmdVariantUri` has no message-event suffix, no
     *   `messageEventDefinition` element), vs. StartEvent_2/EndEvent_2 in
     *   the same file's main Process_1 (which do carry one).
     */
    constructor(
        public readonly id: string,
        public readonly type: string,
        public readonly name: string,
        public readonly properties: Record<string, any> = {},
        public readonly isMessageEvent: boolean = true
    ) {}

    addProperty(key: string, value: string): void {
        this.iflProperties.push(new IflProperty(key, value));
    }
}
