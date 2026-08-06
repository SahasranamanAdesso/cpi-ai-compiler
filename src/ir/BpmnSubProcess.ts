import { BpmnNode } from "./BpmnNode";
import { BpmnSequenceFlow } from "./BpmnSequenceFlow";

/**
 * BpmnSubProcess - Represents a BPMN 2.0 subprocess
 *
 * Subprocesses are nested processes that contain their own start event,
 * end event, and internal flow. In SAP CPI, subprocesses are used for:
 * - Local Integration Process (reusable subprocess)
 * - Exception Subprocess (error handling)
 *
 * BPMN Structure:
 * ```xml
 * <bpmn2:subProcess id="Process_16" name="LP_DataLookup">
 *   <bpmn2:extensionElements>
 *     <ifl:property>
 *       <key>processType</key>
 *       <value>directCall</value>
 *     </ifl:property>
 *   </bpmn2:extensionElements>
 *   <bpmn2:startEvent id="StartEvent_17" name="Start">...</bpmn2:startEvent>
 *   <bpmn2:callActivity id="CallActivity_18" name="...">...</bpmn2:callActivity>
 *   <bpmn2:endEvent id="EndEvent_19" name="End">...</bpmn2:endEvent>
 *   <bpmn2:sequenceFlow id="..." sourceRef="..." targetRef="..."/>
 * </bpmn2:subProcess>
 * ```
 *
 * Evidence:
 * - Local Integration Process: POC.iflw lines 530-546
 * - Exception Subprocess: POC.iflw lines 648-755
 */
export class BpmnSubProcess {
    public readonly id: string;
    public readonly name: string;
    public readonly processType: "integration" | "directCall" | "errorEventSubprocess";
    public readonly nodes: BpmnNode[];
    public readonly flows: BpmnSequenceFlow[];
    public readonly properties: Record<string, any>;
    public startEventId?: string;
    public endEventId?: string;

    /**
     * Creates a new BPMN subprocess
     *
     * @param id - Unique subprocess ID
     * @param name - Display name
     * @param processType - Type of subprocess:
     *   - "integration": Main integration process
     *   - "directCall": Local Integration Process (callable)
     *   - "errorEventSubprocess": Exception handling subprocess
     * @param properties - SAP-specific properties
     */
    constructor(
        id: string,
        name: string,
        processType: "integration" | "directCall" | "errorEventSubprocess" = "directCall",
        properties: Record<string, any> = {}
    ) {
        this.id = id;
        this.name = name;
        this.processType = processType;
        this.nodes = [];
        this.flows = [];
        this.properties = properties;
    }

    /**
     * Adds a node to the subprocess
     *
     * @param node - BPMN node (start event, component, end event, etc.)
     */
    public addNode(node: BpmnNode): void {
        this.nodes.push(node);
    }

    /**
     * Adds a sequence flow to the subprocess
     *
     * @param flow - Sequence flow connecting nodes
     */
    public addFlow(flow: BpmnSequenceFlow): void {
        this.flows.push(flow);
    }

    /**
     * Sets the start event for this subprocess
     *
     * @param startEventId - ID of the start event node
     */
    public setStartEvent(startEventId: string): void {
        this.startEventId = startEventId;
    }

    /**
     * Sets the end event for this subprocess
     *
     * @param endEventId - ID of the end event node
     */
    public setEndEvent(endEventId: string): void {
        this.endEventId = endEventId;
    }

    /**
     * Gets all nodes in the subprocess
     *
     * @returns Array of BPMN nodes
     */
    public getNodes(): BpmnNode[] {
        return this.nodes;
    }

    /**
     * Gets all sequence flows in the subprocess
     *
     * @returns Array of sequence flows
     */
    public getFlows(): BpmnSequenceFlow[] {
        return this.flows;
    }

    /**
     * Checks if this is a Local Integration Process
     *
     * @returns true if processType is "directCall"
     */
    public isLocalIntegrationProcess(): boolean {
        return this.processType === "directCall";
    }

    /**
     * Checks if this is an Exception Subprocess
     *
     * @returns true if processType is "errorEventSubprocess"
     */
    public isExceptionSubprocess(): boolean {
        return this.processType === "errorEventSubprocess";
    }
}
