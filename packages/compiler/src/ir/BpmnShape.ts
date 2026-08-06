/**
 * BpmnShape - Visual shape for BPMN elements
 *
 * Represents the position and size of visual elements in the diagram.
 */
export class BpmnShape {
    constructor(
        public readonly id: string,
        public readonly bpmnElement: string,
        public readonly x: number,
        public readonly y: number,
        public readonly width: number,
        public readonly height: number
    ) {}
}
