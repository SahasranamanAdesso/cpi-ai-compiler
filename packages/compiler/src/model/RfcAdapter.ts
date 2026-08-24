import { toXmlTechnicalName } from '../utils/XmlName';

/**
 * RfcAdapter - RFC adapter for calling SAP RFC-enabled function modules
 *
 * The SAP RFC adapter is Receiver-only: RFC is a synchronous, outbound-only
 * call from Cloud Integration into an SAP system (S/4HANA, ECC, ...) that
 * exposes a remote-enabled function module -- there is no RFC Sender in the
 * Cloud Integration adapter catalog.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow name="RFC"> (ComponentType="RFC")
 * - Always direction="Receiver", connecting the flow's own EndEvent to an
 *   "EndpointRecevier" participant -- i.e. RFC is a flow-level receiver
 *   adapter (set via flow.setReceiver()), the same shape as HTTP/SOAP/SFTP/
 *   IDoc, NOT a mid-flow request-reply call like JdbcCall/ProcessDirectCall.
 *   Evidence: rfc_reference.zip's MessageFlow_6 has sourceRef="EndEvent_2"
 *   targetRef="Participant_2" -- the same flow-level pattern every other
 *   flow-level receiver adapter in this compiler uses, not a serviceTask
 *   sourceRef (which is how JdbcCall/ProcessDirectCall are wired instead).
 *
 * SAP Evidence:
 * - Reference export: "Send Quality Deviation from D3 to S4HANA.iflw"
 *   (rfc_reference.zip), messageFlow "MessageFlow_6":
 *     ComponentType=RFC, TransportProtocol=RFC, MessageProtocol=Synchronous RFC,
 *     ComponentNS=sap, ComponentSWCVName=external, ComponentSWCVId=1.2.1,
 *     componentVersion=1.2, TransportProtocolVersion=1.2.1,
 *     MessageProtocolVersion=1.2.1, direction=Receiver,
 *     destination={{S4 RFC Destination}}, transactioncommit={{S4 RFC Send Confirm Transaction}},
 *     newConnection={{S4 RFC Create New Connection}}, system=S4HANA
 *   cmdVariantUri: ctype::AdapterVariant/cname::sap:RFC/tp::RFC/mp::Synchronous RFC/direction::Receiver/version::1.2.1
 *   NOTE: unlike JDBC/ProcessDirect, this export has NO "Vendor" property on
 *   the RFC messageFlow -- confirmed absent, not omitted by mistake.
 * - parameters.propdef's param_references confirm the RFC adapter has
 *   exactly three externalizable attributes, all under
 *   "ctype::AdapterVariant/cname::sap:RFC/tp::RFC/mp::Synchronous RFC/direction::Receiver/version::1.2.1":
 *     attrId::destination  (uilabel "Destination",             xsd:string)
 *     attrId::transactioncommit (uilabel "Send Confirm Transaction", xsd:boolean)
 *     attrId::newConnection (uilabel "Create New Connection",  xsd:boolean)
 *   No other RFC property is evidenced anywhere in this export.
 *
 * Note: the two boolean properties are documented as `isRequired=false` in
 * parameters.propdef (i.e. genuinely optional in SAP's own UI), and this
 * export happens to have both set to true -- there is no evidence of what
 * SAP's own default is when left unconfigured, so this compiler defaults
 * both to `false` (the same "off unless asked for" convention already used
 * for JdbcAdapter's `batchMode`), not a guessed SAP default.
 */

const SUPPORTED_RECEIVER_KEYS = [
    "name",
    "destination",
    "system",
    "transactioncommit",
    "newConnection"
];

export interface RfcReceiverConfig {
    /** Display name for the adapter/participant (defaults to "RFC") */
    name?: string;
    /** RFC Destination name configured in SAP Integration Suite (required) */
    destination: string;
    /** Name of the receiver system shown in the collaboration diagram (defaults to name) */
    system?: string;
    /** SAP UI label: "Send Confirm Transaction" (default: false) */
    transactioncommit?: boolean;
    /** SAP UI label: "Create New Connection" (default: false) */
    newConnection?: boolean;
}

/**
 * Validates that an RFC receiver config only contains supported keys.
 * SAP's RFC adapter has a fixed, documented set of configurable properties --
 * silently accepting unknown keys would produce a flow that looks configured
 * but writes bogus ifl:property entries into the .iflw. Fail fast instead.
 */
function assertSupportedKeys(config: Record<string, any>): void {
    const unsupported = Object.keys(config).filter(key => !SUPPORTED_RECEIVER_KEYS.includes(key));
    if (unsupported.length > 0) {
        throw new Error(
            `Unsupported RFC property/properties: ${unsupported.join(', ')}. ` +
            `Supported properties: ${SUPPORTED_RECEIVER_KEYS.filter(k => k !== 'name').join(', ')}.`
        );
    }
}

export class RfcAdapter {
    public readonly name: string;
    public readonly direction: "Receiver" = "Receiver";
    public readonly properties: Record<string, any>;

    constructor(name: string, properties: Record<string, any> = {}) {
        this.name = name;
        this.properties = {
            ComponentType: "RFC",
            TransportProtocol: "RFC",
            MessageProtocol: "Synchronous RFC",
            ComponentNS: "sap",
            ...properties
        };
    }

    /**
     * Creates an RFC Receiver adapter (calls a remote-enabled function
     * module on an SAP system via an RFC destination).
     *
     * @param config - Receiver configuration. Only the properties SAP's RFC
     *                 adapter actually supports are accepted; anything else
     *                 throws so misconfigured AI-generated JSON fails loudly
     *                 instead of silently producing an incomplete adapter.
     */
    static receiver(config: RfcReceiverConfig): RfcAdapter {
        assertSupportedKeys(config);

        if (!config.destination || String(config.destination).trim().length === 0) {
            throw new Error('RFC adapter requires destination property');
        }

        const displayName = config.name || "RFC";
        const channelName = toXmlTechnicalName(displayName, "RFC");

        // "system" identifies the connected system shown on the receiver
        // participant box (evidence: "S4HANA") -- sanitized the same way as
        // JdbcAdapter's caller-configurable "system", since it is written
        // both as this literal property AND (indirectly) associated with
        // the participant box.
        const systemName = toXmlTechnicalName(config.system || displayName, "RFC");

        const properties: Record<string, any> = {
            destination: config.destination,
            system: systemName,
            Name: channelName,
            Description: "",
            componentVersion: "1.2",
            TransportProtocolVersion: "1.2.1",
            ComponentSWCVName: "external",
            transactioncommit: String(config.transactioncommit === true),
            newConnection: String(config.newConnection === true),
            MessageProtocolVersion: "1.2.1",
            ComponentSWCVId: "1.2.1",
            direction: "Receiver"
        };

        return new RfcAdapter(channelName, properties);
    }

    public isSender(): boolean {
        return false;
    }

    public isReceiver(): boolean {
        return true;
    }

    public getCmdVariantUri(): string {
        return "ctype::AdapterVariant/cname::sap:RFC/tp::RFC/mp::Synchronous RFC/direction::Receiver/version::1.2.1";
    }
}
