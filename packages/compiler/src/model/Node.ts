/**
 * Node - Abstract base class for all CPI flow components
 *
 * Every component in a CPI iFlow (Sender, Receiver, Content Modifier, Router, etc.)
 * is represented as a Node. Each node has an ID, name, and type that maps to
 * the BPMN/IFL XML representation.
 *
 * This is an abstract class - you cannot instantiate it directly.
 * Instead, use specific node types like SenderNode, ReceiverNode, etc.
 */
export abstract class Node {
    /**
     * Creates a new Node
     * @param id - Unique identifier for this node (e.g., "Sender_1", "ContentModifier_1")
     * @param name - Human-readable name (e.g., "HTTPS Sender", "Set Headers")
     * @param type - Component type (e.g., "HTTPS", "Enricher", "Router")
     */
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly type: string
    ) {}
}
