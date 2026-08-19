import { Component } from "./Component";
import { JdbcAdapter, JdbcReceiverConfig } from "./JdbcAdapter";
import { IdGenerator } from "../utils/IdGenerator";

/**
 * JdbcCall - Mid-flow request-reply call to a database via the JDBC adapter
 *
 * Unlike HTTP/SOAP/SFTP/IDoc/OData, which the compiler only ever needs as a
 * single flow-level sender or receiver, JDBC is almost always called mid-flow
 * (query a database, keep processing the result) and a single iFlow may call
 * more than one database or the same database more than once. This component
 * models that: it produces a BPMN <serviceTask activityType="ExternalCall">
 * node placed like any other step between components, and separately carries
 * the JdbcAdapter configuration that BpmnProcessMapper uses to add a matching
 * receiver participant + "JDBC" messageFlow to the collaboration.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:serviceTask activityType="ExternalCall">
 * - Paired with an "EndpointRecevier" participant via a JDBC messageFlow
 * - The SQL statement is NOT a property of this step -- it is the message
 *   body at the time of the call. Precede this component with a
 *   ContentModifier (wrapContent = the SQL) exactly as real SAP flows do.
 *
 * SAP Evidence:
 * - ServiceTask_8 "RR_OCEDB" in "Send Inbound Normal Orders from OCE to
 *   S4HANA.iflw": activityType=ExternalCall, componentVersion=1.0,
 *   cmdVariantUri=ctype::FlowstepVariant/cname::ExternalCall/version::1.0.4
 *   (no other properties on the step itself -- all adapter config lives on
 *   the paired messageFlow, see JdbcAdapter.ts)
 *
 * Example usage:
 * ```typescript
 * const setQuery = createComponent('ContentModifier', {
 *     name: 'Set DB Query',
 *     bodyType: 'constant',
 *     wrapContent: "SELECT * FROM ORDERS WHERE STATUS = 'NEW'"
 * });
 * const jdbcCall = new JdbcCall('Query Orders DB', JdbcAdapter.receiver({
 *     dataSourceAlias: 'ORDERS_DB'
 * }));
 * flow.addComponent(setQuery).addComponent(jdbcCall);
 * flow.connect(setQuery, jdbcCall);
 * ```
 */
export class JdbcCall extends Component {

    /**
     * The JDBC adapter configuration for this call. BpmnProcessMapper reads
     * this to generate the companion participant + messageFlow -- it is not
     * part of this component's own BPMN properties (the ServiceTask itself
     * carries no adapter configuration; see class doc above).
     */
    public readonly adapter: JdbcAdapter;

    /**
     * Creates a new JDBC Call component
     *
     * @param name - Display name for the step (e.g., "Query Orders DB")
     * @param adapter - JDBC receiver adapter configuration (see JdbcAdapter.receiver)
     * @param id - Optional component ID (auto-generated if not provided). Always
     *             pass an explicit id when creating multiple JdbcCall instances
     *             in the same flow so each gets a stable, caller-controlled ID.
     */
    constructor(name: string, adapter: JdbcAdapter, id?: string) {
        const componentId = id || IdGenerator.next("JdbcCall");
        super(componentId, name, "JdbcCall", {});
        this.adapter = adapter;
    }

    /**
     * Convenience factory that builds the adapter from a plain config object,
     * matching the shape ComponentFactory.createComponent uses for AI JSON.
     */
    static query(name: string, config: JdbcReceiverConfig, id?: string): JdbcCall {
        return new JdbcCall(name, JdbcAdapter.receiver({ ...config, name: config.name || name }), id);
    }
}
