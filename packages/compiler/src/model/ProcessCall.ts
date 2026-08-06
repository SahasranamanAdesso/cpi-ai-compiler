import { Component } from "./Component";

/**
 * ProcessCall - Invokes a Local Integration Process (subprocess)
 *
 * Calls another integration process within the same iFlow, enabling modular
 * and reusable integration logic. The called process executes as a subprocess
 * and returns control to the calling flow upon completion.
 *
 * In SAP Integration Suite:
 * - BPMN element: <callActivity activityType="ProcessCallElement">
 * - Invokes Local Integration Process by processId
 * - Subprocess runs synchronously (blocking)
 * - Can be non-looping (execute once) or looping (iterate over splits)
 *
 * Architecture:
 * - Extends Component (same pattern as Content Modifier, Router)
 * - References Local Integration Process by ID
 * - Process must be defined in same iFlow
 *
 * Example usage:
 * ```typescript
 * // First, create a Local Integration Process
 * const subprocess = new LocalIntegrationProcess("DataLookup");
 * // ... add components to subprocess ...
 * flow.addProcess(subprocess);
 *
 * // Then, call it from main process
 * const processCall = new ProcessCall(
 *     "Call Data Lookup",
 *     subprocess.id
 * );
 * flow.addComponent(processCall);
 * ```
 *
 * SAP Evidence:
 * - BPMN: POC.iflw lines 1058-1081
 * - Component: activityType="ProcessCallElement", subActivityType="NonLoopingProcess"
 * - Version: 1.0, cmdVariantUri version 1.0.4
 */
export class ProcessCall extends Component {

    /**
     * Creates a new Process Call component
     *
     * @param name - Display name for the call (e.g., "Call Data Lookup")
     * @param processId - ID of the Local Integration Process to call
     * @param looping - If true, creates LoopingProcess (iterates over message splits)
     *                  If false (default), creates NonLoopingProcess (executes once)
     * @param additionalProperties - Optional additional SAP properties
     *
     * NonLoopingProcess: Executes subprocess once with current message
     * LoopingProcess: Iterates over message splits (after Splitter component)
     */
    constructor(
        name: string,
        processId: string,
        looping: boolean = false,
        additionalProperties: Record<string, any> = {}
    ) {
        const id = `ProcessCall_${Date.now()}`;

        const subActivityType = looping ? "LoopingProcess" : "NonLoopingProcess";

        const properties = {
            processId: processId,
            ...additionalProperties
        };

        super(id, name, "ProcessCall", properties);

        // Store subActivityType as property (needed for BPMN generation)
        this.properties.subActivityType = subActivityType;
    }

    /**
     * Creates a looping Process Call that iterates over message splits
     *
     * Used after a Splitter component to process each split message through
     * the called subprocess.
     *
     * @param name - Display name
     * @param processId - ID of Local Integration Process
     * @returns ProcessCall instance configured for looping
     */
    static looping(name: string, processId: string): ProcessCall {
        return new ProcessCall(name, processId, true);
    }

    /**
     * Gets the ID of the process being called
     *
     * @returns Process ID
     */
    public getProcessId(): string {
        return this.properties.processId || "";
    }

    /**
     * Checks if this is a looping process call
     *
     * @returns true if looping, false if non-looping
     */
    public isLooping(): boolean {
        return this.properties.subActivityType === "LoopingProcess";
    }
}
