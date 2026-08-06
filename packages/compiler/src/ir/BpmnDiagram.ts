import { BpmnShape } from "./BpmnShape";
import { BpmnEdge } from "./BpmnEdge";

/**
 * BpmnDiagram - BPMN Diagram Interchange element
 *
 * Represents the visual layout information for the graphical editor.
 * Without this, SAP Integration Suite cannot render the flow.
 */
export class BpmnDiagram {
    public readonly shapes: BpmnShape[] = [];
    public readonly edges: BpmnEdge[] = [];

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly planeId: string,
        public readonly planeElement: string
    ) {}

    addShape(shape: BpmnShape): void {
        this.shapes.push(shape);
    }

    addEdge(edge: BpmnEdge): void {
        this.edges.push(edge);
    }
}
