import { BpmnNode } from "./BpmnNode";
import { BpmnSequenceFlow } from "./BpmnSequenceFlow";
import { IflProperty } from "./IflProperty";

/**
 * BpmnProcess - Intermediate Representation of a complete BPMN process
 *
 * This is the IR that sits between our SDK model (IFlow) and XML output.
 * It represents the complete BPMN process structure before serialization.
 *
 * A BPMN process consists of:
 * - nodes: All BPMN elements (start, end, tasks, gateways, etc.)
 * - flows: All sequence flows connecting the nodes
 *
 * Architecture:
 *
 *   IFlow (SDK)
 *       ↓
 *   IFlowCompiler
 *       ↓
 *   BpmnProcess (IR) ← We are here
 *       ↓
 *   XMLWriter
 *       ↓
 *   .iflw (CPI artifact)
 *
 * Why this exists:
 * - Separates SDK concepts from BPMN concepts
 * - Makes validation easier (validate BPMN structure before XML)
 * - Enables multiple output formats (XML, diagrams, docs) from same IR
 * - Allows optimization passes before serialization
 *
 * Example structure:
 *
 *   BpmnProcess {
 *       nodes: [
 *           BpmnNode("StartEvent_1", "startEvent", "Start"),
 *           BpmnNode("CallActivity_1", "callActivity", "Set Headers"),
 *           BpmnNode("EndEvent_1", "endEvent", "End")
 *       ],
 *       flows: [
 *           BpmnSequenceFlow("StartEvent_1", "CallActivity_1"),
 *           BpmnSequenceFlow("CallActivity_1", "EndEvent_1")
 *       ]
 *   }
 *
 * This IR is then serialized to:
 *
 *   <process>
 *       <startEvent id="StartEvent_1" name="Start"/>
 *       <callActivity id="CallActivity_1" name="Set Headers">...</callActivity>
 *       <endEvent id="EndEvent_1" name="End"/>
 *       <sequenceFlow sourceRef="StartEvent_1" targetRef="CallActivity_1"/>
 *       <sequenceFlow sourceRef="CallActivity_1" targetRef="EndEvent_1"/>
 *   </process>
 */
export class BpmnProcess {
    public readonly nodes: BpmnNode[] = [];
    public readonly flows: BpmnSequenceFlow[] = [];
    public readonly properties: IflProperty[] = [];

    constructor(
        public readonly id: string,
        public readonly name: string
    ) {}

    addProperty(key: string, value: string): void {
        this.properties.push(new IflProperty(key, value));
    }
}
