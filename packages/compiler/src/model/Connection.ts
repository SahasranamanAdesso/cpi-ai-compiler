import { Component } from "./Component";

/**
 * Connection - Represents a sequence flow between two components in a CPI iFlow
 *
 * In BPMN, these are called "sequenceFlow" elements. They represent the arrows
 * that connect components in the integration flow diagram.
 *
 * Example:
 *   HTTPS Sender
 *        |  <-- This is a Connection
 *        v
 *   Content Modifier
 *        |  <-- This is another Connection
 *        v
 *   HTTPS Receiver
 *
 * In the generated BPMN XML, this becomes:
 * <bpmn2:sequenceFlow sourceRef="Sender_1" targetRef="ContentModifier_1"/>
 */
export class Connection {
    /**
     * Creates a new Connection between two components
     * @param from - The source component
     * @param to - The target component
     */
    constructor(
        public readonly from: Component,
        public readonly to: Component
    ) {}
}
