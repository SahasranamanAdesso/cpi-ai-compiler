import { BpmnCollaboration } from "./BpmnCollaboration";
import { BpmnProcess } from "./BpmnProcess";
import { BpmnDiagram } from "./BpmnDiagram";

/**
 * BpmnDefinitions - Root BPMN element
 */
export class BpmnDefinitions {
    public readonly namespaces: Map<string, string>;
    public diagram?: BpmnDiagram;

    constructor(
        public readonly id: string,
        public readonly collaboration: BpmnCollaboration,
        public readonly process: BpmnProcess,
        /**
         * Sibling top-level `<bpmn2:process>` elements beyond the main
         * Integration Process -- one per Local Integration Process declared
         * on the IFlow (`flow.getSubProcesses()`). Evidence:
         * process_direct_reference.zip has `Process_49` ("Exception
         * Handling", processType=directCall) as a full sibling of `Process_1`
         * at the definitions root, each referenced by its own
         * `ifl:type="IntegrationProcess"` participant in the collaboration.
         */
        public readonly additionalProcesses: BpmnProcess[] = []
    ) {
        // Standard BPMN + SAP namespaces from reference artifact
        this.namespaces = new Map([
            ['bpmn2', 'http://www.omg.org/spec/BPMN/20100524/MODEL'],
            ['bpmndi', 'http://www.omg.org/spec/BPMN/20100524/DI'],
            ['dc', 'http://www.omg.org/spec/DD/20100524/DC'],
            ['di', 'http://www.omg.org/spec/DD/20100524/DI'],
            ['ifl', 'http:///com.sap.ifl.model/Ifl.xsd'],
            ['xsi', 'http://www.w3.org/2001/XMLSchema-instance']
        ]);
    }

    setDiagram(diagram: BpmnDiagram): void {
        this.diagram = diagram;
    }
}
