import { IflProperty } from "./IflProperty";

/**
 * BpmnParticipant - BPMN Participant (Sender/Receiver or Integration Process)
 */
export class BpmnParticipant {
    public readonly properties: IflProperty[] = [];

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly iflType: string,
        public readonly processRef?: string
    ) {}

    addProperty(key: string, value: string): void {
        this.properties.push(new IflProperty(key, value));
    }
}
