import { Node } from "./Node";
import { IdGenerator } from "../utils/IdGenerator";

/**
 * SenderNode - Represents a Sender adapter in a CPI iFlow
 *
 * A sender is the entry point of an integration flow. It receives messages
 * from external systems via protocols like HTTPS, SOAP, OData, etc.
 *
 * In BPMN, this corresponds to a Participant with ifl:type="EndpointSender"
 */
export class SenderNode extends Node {
    /**
     * Creates a new SenderNode with an auto-generated ID
     * @param name - Human-readable name (e.g., "HTTPS Sender")
     * @param type - Protocol/adapter type (e.g., "HTTPS", "SOAP", "OData")
     */
    constructor(name: string, type: string) {
        super(IdGenerator.next("Sender"), name, type);
    }
}
