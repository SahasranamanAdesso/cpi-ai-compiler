import { toXmlTechnicalName } from '../utils/XmlName';

/**
 * JdbcAdapter - JDBC adapter for querying/updating external databases
 *
 * The SAP JDBC adapter is Receiver-only: SAP Integration Suite has no JDBC
 * Sender (a database cannot push a message into CPI). It is always used as
 * a request-reply call -- the outgoing SQL statement is the message body at
 * the time of the call (typically set by a preceding Content Modifier), and
 * the adapter returns the result set as the new message body.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow name="JDBC"> (ComponentType="JDBC")
 * - Always direction="Receiver"
 * - Connects a <bpmn2:serviceTask activityType="ExternalCall"> to an
 *   "EndpointRecevier" participant (see model/JdbcCall.ts for the
 *   mid-flow call step that owns this adapter + participant pair)
 *
 * SAP Evidence:
 * - Reference export: "Send Inbound Normal Orders from OCE to S4HANA.iflw"
 *   messageFlow "MessageFlow_12" (lines 95-182 of the exported .iflw):
 *     ComponentType=JDBC, TransportProtocol=JDBC, MessageProtocol=JDBC,
 *     ComponentNS=sap, Vendor=SAP, ComponentSWCVName=external, ComponentSWCVId=1.5.3,
 *     componentVersion=1.5, TransportProtocolVersion=1.5.3,
 *     MessageProtocolVersion=1.5.3, direction=Receiver, batchOperation=atomic,
 *     batchMode=false, alias={{DB Alias}}, connectionTimeout={{DBTO}},
 *     queryTimeout={{DBrTO}}, pageSize={{DMMaxRecords}}, system=<participant name>
 *   cmdVariantUri: ctype::AdapterVariant/cname::JDBC/vendor::SAP/tp::JDBC/mp::JDBC/direction::Receiver/version::1.5.3
 *   NOTE: an earlier version of this adapter omitted the `Vendor` property
 *   entirely, which is present in every real export of this adapter type
 *   (unlike HTTP/SOAP, where it does not appear) -- restored to match.
 * - parameters.propdef param_references confirm the externalizable JDBC
 *   attributes and their UI labels: queryTimeout ("Query/Response Timeout
 *   (in s)"), pageSize ("Maximum Records"), alias ("JDBC Data Source Alias"),
 *   connectionTimeout ("Connection Timeout (in s)").
 *
 * Note: the SQL statement itself is NOT an adapter property in SAP's model --
 * it is the incoming message body. Use a ContentModifier (wrapContent) before
 * the JdbcCall step to set the query, exactly as the reference export does
 * (its "CM_SetDBQuery" Content Modifier precedes the "RR_OCEDB" JDBC call).
 */

const SUPPORTED_BATCH_OPERATIONS = ["atomic", "notAtomic"] as const;
type BatchOperation = typeof SUPPORTED_BATCH_OPERATIONS[number];

const SUPPORTED_RECEIVER_KEYS = [
    "name",
    "dataSourceAlias",
    "system",
    "connectionTimeout",
    "queryTimeout",
    "maxRecords",
    "batchMode",
    "batchOperation"
];

export interface JdbcReceiverConfig {
    /** Display name for the adapter/participant (defaults to "JDBC") */
    name?: string;
    /** JDBC Data Source Alias configured in SAP Integration Suite (required) */
    dataSourceAlias: string;
    /** Name of the receiver system shown in the collaboration diagram (defaults to name) */
    system?: string;
    /** Connection Timeout, in seconds (SAP UI label: "Connection Timeout (in s)") */
    connectionTimeout?: number;
    /** Query/Response Timeout, in seconds (SAP UI label: "Query/Response Timeout (in s)") */
    queryTimeout?: number;
    /** Maximum Records to return (SAP UI label: "Maximum Records") */
    maxRecords?: number;
    /** Whether statements are executed as a batch */
    batchMode?: boolean;
    /** Batch execution mode when batchMode is true */
    batchOperation?: BatchOperation;
}

/**
 * Validates that a JDBC receiver config only contains supported keys.
 * SAP's JDBC adapter has a fixed, documented set of configurable properties --
 * silently accepting unknown keys would produce a flow that looks configured
 * but is missing required SAP properties, or worse, writes bogus ifl:property
 * entries into the .iflw. Fail fast instead.
 */
function assertSupportedKeys(config: Record<string, any>): void {
    const unsupported = Object.keys(config).filter(key => !SUPPORTED_RECEIVER_KEYS.includes(key));
    if (unsupported.length > 0) {
        throw new Error(
            `Unsupported JDBC property/properties: ${unsupported.join(', ')}. ` +
            `Supported properties: ${SUPPORTED_RECEIVER_KEYS.filter(k => k !== 'name').join(', ')}.`
        );
    }
}

export class JdbcAdapter {
    public readonly name: string;
    public readonly direction: "Receiver" = "Receiver";
    public readonly properties: Record<string, any>;

    constructor(name: string, properties: Record<string, any> = {}) {
        this.name = name;
        this.properties = {
            ComponentType: "JDBC",
            TransportProtocol: "JDBC",
            MessageProtocol: "JDBC",
            ComponentNS: "sap",
            ...properties
        };
    }

    /**
     * Creates a JDBC Receiver adapter (queries/updates a database)
     *
     * @param config - Receiver configuration. Only the properties SAP's JDBC
     *                 adapter actually supports are accepted; anything else
     *                 throws so misconfigured AI-generated JSON fails loudly
     *                 instead of silently producing an incomplete adapter.
     */
    static receiver(config: JdbcReceiverConfig): JdbcAdapter {
        assertSupportedKeys(config);

        if (!config.dataSourceAlias || String(config.dataSourceAlias).trim().length === 0) {
            throw new Error('JDBC adapter requires dataSourceAlias property');
        }

        if (config.batchOperation && !SUPPORTED_BATCH_OPERATIONS.includes(config.batchOperation)) {
            throw new Error(
                `Unsupported JDBC batchOperation: ${config.batchOperation}. ` +
                `Supported values: ${SUPPORTED_BATCH_OPERATIONS.join(', ')}.`
            );
        }

        const displayName = config.name || "JDBC";
        const channelName = toXmlTechnicalName(displayName, "JDBC");
        const batchMode = config.batchMode === true;

        // "system" identifies the connected system shown on the receiver
        // participant box. Every other adapter in this compiler hardcodes it
        // to a plain literal ("Sender"/"Receiver") because real SAP exports
        // always show it as a clean identifier (evidence: "OCE", "S4HANA",
        // "GlobalExceptionHandling" in the reference JDBC/SOAP exports --
        // never free text with spaces/punctuation). JDBC is the one adapter
        // here where "system" is caller-configurable, so it must go through
        // the same NCName-style sanitization as the channel name, or a
        // display name like "Vendor Payment Terms Lookup (JDBC)" ends up as
        // the literal `system` property AND the participant box name,
        // which SAP rejects. The human-readable text is preserved in `Name`.
        const systemName = toXmlTechnicalName(config.system || displayName, "JDBC");

        const properties: Record<string, any> = {
            alias: config.dataSourceAlias,
            connectionTimeout: (config.connectionTimeout ?? 60).toString(),
            queryTimeout: (config.queryTimeout ?? 60).toString(),
            pageSize: (config.maxRecords ?? 100).toString(),
            batchMode: String(batchMode),
            batchOperation: config.batchOperation || "atomic",
            // SAP rejects whitespace in this "Name" property too, not just
            // the channel name (confirmed against a live tenant) -- use the
            // same sanitized value as the channel name.
            system: systemName,
            Name: channelName,
            Description: "",
            Vendor: "SAP",
            componentVersion: "1.5",
            TransportProtocolVersion: "1.5.3",
            MessageProtocolVersion: "1.5.3",
            ComponentSWCVName: "external",
            ComponentSWCVId: "1.5.3",
            direction: "Receiver"
        };

        // channelName is used as the messageFlow "name" XML attribute when
        // this adapter is set via flow.setReceiver() (the single flow-level
        // JDBC case) -- it must be a valid NCName. JdbcCall's own mid-flow
        // messageFlow uses a fixed "JDBC" literal instead (see
        // BpmnProcessMapper.ts) and is unaffected by this.
        return new JdbcAdapter(channelName, properties);
    }

    public isSender(): boolean {
        return false;
    }

    public isReceiver(): boolean {
        return true;
    }

    public getCmdVariantUri(): string {
        return "ctype::AdapterVariant/cname::JDBC/vendor::SAP/tp::JDBC/mp::JDBC/direction::Receiver/version::1.5.3";
    }
}
