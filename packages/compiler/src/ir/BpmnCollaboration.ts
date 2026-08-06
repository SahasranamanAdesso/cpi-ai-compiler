import { BpmnParticipant } from "./BpmnParticipant";
import { BpmnMessageFlow } from "./BpmnMessageFlow";
import { IflProperty } from "./IflProperty";

/**
 * BpmnCollaboration - BPMN Collaboration (container for participants and message flows)
 */
export class BpmnCollaboration {
    public readonly participants: BpmnParticipant[] = [];
    public readonly messageFlows: BpmnMessageFlow[] = [];
    public readonly properties: IflProperty[] = [];

    constructor(
        public readonly id: string,
        public readonly name: string
    ) {}

    addParticipant(participant: BpmnParticipant): void {
        this.participants.push(participant);
    }

    addMessageFlow(messageFlow: BpmnMessageFlow): void {
        this.messageFlows.push(messageFlow);
    }

    addProperty(key: string, value: string): void {
        this.properties.push(new IflProperty(key, value));
    }
}
