/**
 * Waypoint for BPMN edges
 */
export class Waypoint {
    constructor(
        public readonly x: number,
        public readonly y: number
    ) {}
}

/**
 * BpmnEdge - Visual edge for BPMN flows
 *
 * Represents connection lines between elements in the diagram.
 */
export class BpmnEdge {
    public readonly waypoints: Waypoint[] = [];

    constructor(
        public readonly id: string,
        public readonly bpmnElement: string,
        public readonly sourceElement: string,
        public readonly targetElement: string
    ) {}

    addWaypoint(x: number, y: number): void {
        this.waypoints.push(new Waypoint(x, y));
    }
}
