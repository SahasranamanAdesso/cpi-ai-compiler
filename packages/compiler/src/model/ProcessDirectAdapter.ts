import { toXmlTechnicalName } from '../utils/XmlName';

/**
 * ProcessDirectAdapter - SAP Process Direct adapter for iFlow-to-iFlow calls
 *
 * Process Direct lets one integration flow call another within the same
 * tenant, purely in-memory (no network hop) -- one flow exposes a Process
 * Direct address as its Sender, another flow calls that address as a
 * Receiver. Unlike JDBC, Process Direct genuinely has BOTH directions in
 * real SAP exports:
 * - Sender: this flow's OWN entry point (Participant -> StartEvent), used
 *   exactly like an HTTP/SOAP/IDoc sender -- some OTHER flow calls in here.
 * - Receiver: a mid-flow request-reply call OUT to another flow's Process
 *   Direct sender address (see model/ProcessDirectCall.ts for the
 *   multi-instance mid-flow step that owns this adapter + participant pair,
 *   which mirrors JdbcCall exactly).
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow name="ProcessDirect"> (ComponentType="ProcessDirect")
 * - TransportProtocol/MessageProtocol: "Not Applicable" (no network protocol --
 *   purely an internal routing key)
 * - Only ONE adapter-specific property: `address` (the routing path, must
 *   start with "/" -- confirmed via parameters.propdef in both reference
 *   exports, where `address` is the sole externalizable Process Direct
 *   attribute, UI label "Address")
 *
 * SAP Evidence (TWO independent real exports agree on every value below):
 * - "Send Outbound Sales Order Status from S4HANA to OCE.iflw":
 *   - Sender: MessageFlow_6 (Participant_1 "S4HANA" -> StartEvent_2)
 *     ComponentType=ProcessDirect, Vendor=SAP, ComponentNS=sap,
 *     componentVersion=1.1, TransportProtocolVersion=1.1.2,
 *     ComponentSWCVName=external, ComponentSWCVId=1.1.2,
 *     TransportProtocol=MessageProtocol=Not Applicable,
 *     MessageProtocolVersion=1.1.2, direction=Sender,
 *     cmdVariantUri=.../direction::Sender/version::1.1.2
 *   - Receiver: MessageFlow_59 (ServiceTask_56 "RR_ErrorDetails" -> Participant_58 "GlobalExceptionHandling")
 *     identical properties except direction=Receiver,
 *     cmdVariantUri=.../direction::Receiver/version::1.1.1 (note: the
 *     cmdVariantUri version SUFFIX differs by direction -- 1.1.2 for
 *     Sender, 1.1.1 for Receiver -- while componentVersion/
 *     TransportProtocolVersion/ComponentSWCVId stay 1.1/1.1.2 for both)
 * - Reference JDBC export ("Send Inbound Normal Orders from OCE to
 *   S4HANA.iflw"), MessageFlow_61 (ServiceTask_57 -> Participant_60
 *   "GlobalExceptionHandling"): identical Receiver cmdVariantUri
 *   (.../direction::Receiver/version::1.1.1), confirming this is not a
 *   one-off typo in a single export.
 */

const SUPPORTED_KEYS = ["name", "address", "system"];

export interface ProcessDirectConfig {
    /** Display name for the adapter/participant (defaults to "ProcessDirect") */
    name?: string;
    /** Process Direct routing address, e.g. "/process/orders" (required, must start with "/") */
    address: string;
    /** Name of the connected system shown in the collaboration diagram (defaults to name) */
    system?: string;
}

function assertSupportedKeys(config: Record<string, any>): void {
    const unsupported = Object.keys(config).filter(key => !SUPPORTED_KEYS.includes(key));
    if (unsupported.length > 0) {
        throw new Error(
            `Unsupported Process Direct property/properties: ${unsupported.join(', ')}. ` +
            `Supported properties: ${SUPPORTED_KEYS.filter(k => k !== 'name').join(', ')}.`
        );
    }
}

/**
 * Normalizes a Process Direct address to a relative path beginning with "/".
 * Both directions route purely by this internal key (there is no host or
 * scheme), so SAP requires the leading "/" regardless of Sender/Receiver --
 * same convention as HttpAdapter's sender address.
 */
function normalizeAddress(address: string | undefined): string {
    const value = (address || '').trim();
    if (value.length === 0) {
        return '';
    }
    return value.startsWith('/') ? value : `/${value}`;
}

export class ProcessDirectAdapter {
    public readonly name: string;
    public readonly direction: "Sender" | "Receiver";
    public readonly properties: Record<string, any>;

    constructor(name: string, direction: "Sender" | "Receiver", properties: Record<string, any> = {}) {
        this.name = name;
        this.direction = direction;
        this.properties = {
            ComponentType: "ProcessDirect",
            TransportProtocol: "Not Applicable",
            MessageProtocol: "Not Applicable",
            ComponentNS: "sap",
            ...properties
        };
    }

    private static build(direction: "Sender" | "Receiver", config: ProcessDirectConfig): ProcessDirectAdapter {
        assertSupportedKeys(config);

        if (!config.address || String(config.address).trim().length === 0) {
            throw new Error('Process Direct adapter requires address property');
        }

        const address = normalizeAddress(config.address);
        if (!address.startsWith('/')) {
            throw new Error(`Process Direct address must be a relative path beginning with "/" (got: ${JSON.stringify(config.address)})`);
        }

        const displayName = config.name || "ProcessDirect";
        // Evidence shows the channel is always literally "ProcessDirect" in
        // both real exports (never customized) -- matches this compiler's
        // existing JDBC pattern of a fixed base channel name rather than one
        // derived from the display name. Sanitized anyway for safety if a
        // caller ever supplies something else via `name`.
        const channelName = toXmlTechnicalName("ProcessDirect", "ProcessDirect");
        const systemName = toXmlTechnicalName(config.system || displayName, "ProcessDirect");

        const properties: Record<string, any> = {
            address,
            system: systemName,
            Name: channelName,
            Description: "",
            Vendor: "SAP",
            componentVersion: "1.1",
            TransportProtocolVersion: "1.1.2",
            MessageProtocolVersion: "1.1.2",
            ComponentSWCVName: "external",
            ComponentSWCVId: "1.1.2",
            direction
        };

        return new ProcessDirectAdapter(channelName, direction, properties);
    }

    /**
     * Creates a Process Direct Sender adapter (exposes this flow to be
     * called by another flow's Process Direct receiver at the given address)
     */
    static sender(config: ProcessDirectConfig): ProcessDirectAdapter {
        return ProcessDirectAdapter.build("Sender", config);
    }

    /**
     * Creates a Process Direct Receiver adapter (calls another flow's
     * Process Direct sender at the given address)
     */
    static receiver(config: ProcessDirectConfig): ProcessDirectAdapter {
        return ProcessDirectAdapter.build("Receiver", config);
    }

    public isSender(): boolean {
        return this.direction === "Sender";
    }

    public isReceiver(): boolean {
        return this.direction === "Receiver";
    }

    /**
     * cmdVariantUri version suffix differs by direction in both reference
     * exports: 1.1.2 for Sender, 1.1.1 for Receiver. Not a guess -- see
     * class doc for the two independent exports that agree on this.
     */
    public getCmdVariantUri(): string {
        const versionSuffix = this.direction === "Sender" ? "1.1.2" : "1.1.1";
        return `ctype::AdapterVariant/cname::ProcessDirect/vendor::SAP/tp::Not Applicable/mp::Not Applicable/direction::${this.direction}/version::${versionSuffix}`;
    }
}
