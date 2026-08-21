import { Component } from "./Component";
import { ProcessDirectAdapter, ProcessDirectConfig } from "./ProcessDirectAdapter";
import { IdGenerator } from "../utils/IdGenerator";

/**
 * ProcessDirectCall - Mid-flow request-reply call to another integration
 * flow via the Process Direct adapter
 *
 * Like JdbcCall, this is a mid-flow component (not just a flow-level
 * sender/receiver): a single iFlow may call more than one other flow via
 * Process Direct, and the reference exports show it used exactly like
 * JDBC's mid-flow pattern -- a BPMN <serviceTask activityType="ExternalCall">
 * paired with a receiver participant + "ProcessDirect" messageFlow, never a
 * <callActivity>.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:serviceTask activityType="ExternalCall">
 * - Paired with an "EndpointRecevier" participant via a ProcessDirect messageFlow
 * - No message body requirement like JDBC's SQL -- the call simply invokes
 *   the target flow's Process Direct sender address with the current
 *   message, and continues processing with whatever that flow returns.
 *
 * SAP Evidence:
 * - ServiceTask_56 "RR_ErrorDetails" in "Send Outbound Sales Order Status
 *   from S4HANA to OCE.iflw": activityType=ExternalCall, componentVersion=1.0,
 *   cmdVariantUri=ctype::FlowstepVariant/cname::ExternalCall/version::1.0.4
 *   -- identical metadata to JdbcCall's serviceTask (see JdbcCall.ts), so
 *   this reuses the same Registry entry pattern rather than inventing a new
 *   activityType.
 *
 * Example usage:
 * ```typescript
 * const callOtherFlow = new ProcessDirectCall('Call Domestic Order Flow', ProcessDirectAdapter.receiver({
 *     address: '/process/domestic-orders'
 * }));
 * flow.addComponent(callOtherFlow);
 * ```
 */
export class ProcessDirectCall extends Component {

    /**
     * The Process Direct adapter configuration for this call. BpmnProcessMapper
     * reads this to generate the companion participant + messageFlow -- it is
     * not part of this component's own BPMN properties (the ServiceTask
     * itself carries no adapter configuration, matching JdbcCall).
     */
    public readonly adapter: ProcessDirectAdapter;

    /**
     * Creates a new Process Direct Call component
     *
     * @param name - Display name for the step (e.g., "Call Domestic Order Flow")
     * @param adapter - Process Direct receiver adapter configuration (see ProcessDirectAdapter.receiver)
     * @param id - Optional component ID (auto-generated if not provided). Always
     *             pass an explicit id when creating multiple ProcessDirectCall
     *             instances in the same flow so each gets a stable id.
     */
    constructor(name: string, adapter: ProcessDirectAdapter, id?: string) {
        const componentId = id || IdGenerator.next("ProcessDirectCall");
        super(componentId, name, "ProcessDirectCall", {});
        this.adapter = adapter;
    }

    /**
     * Convenience factory that builds the adapter from a plain config object,
     * matching the shape ComponentFactory.createComponent uses for AI JSON.
     */
    static call(name: string, config: ProcessDirectConfig, id?: string): ProcessDirectCall {
        return new ProcessDirectCall(name, ProcessDirectAdapter.receiver({ ...config, name: config.name || name }), id);
    }
}
