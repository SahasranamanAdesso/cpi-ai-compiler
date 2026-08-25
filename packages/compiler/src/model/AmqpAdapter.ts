import { toXmlTechnicalName } from '../utils/XmlName';

/**
 * AmqpAdapter - AMQP 1.0 adapter for consuming messages from SAP Event Mesh
 *
 * Evidence shows exactly ONE direction: Sender. This is NOT RabbitMQ-style
 * AMQP 0.9.1 (no exchange/routingKey/virtualHost concepts exist anywhere in
 * the reference) -- it is SAP Event Mesh's AMQP 1.0 over WebSocket, evidenced
 * by `system=EventMesh`, `MessageProtocol=AMQP1.0`, `TransportProtocol=WS`,
 * and a `destinationName` (AMQP's unified queue/topic addressing concept,
 * not a separate "queueName"/"exchange"/"routingKey" split).
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow name="AMQP"> (ComponentType="AMQP")
 * - Flow-level Sender only: Participant -> StartEvent, the same shape as
 *   every other flow-level sender adapter (HTTP, JMS, SOAP, ...). No
 *   Receiver messageFlow and no mid-flow serviceTask/callActivity pattern
 *   exist anywhere in the reference, so (matching the explicit instruction
 *   to implement only the roles actually supported) this compiler does NOT
 *   model an AMQP Receiver or a mid-flow "AmqpCall" component.
 *
 * SAP Evidence:
 * - Reference export: "Send Outbound Batch Material Replication from
 *   S4HANA to D3.iflw" (amqp_reference.zip), messageFlow "MessageFlow_882"
 *   (sourceRef=Participant_1, targetRef=StartEvent_2):
 *     ComponentType=AMQP, ComponentNS=sap, TransportProtocol=WS,
 *     MessageProtocol=AMQP1.0, componentVersion=1.7,
 *     TransportProtocolVersion=1.8.0, MessageProtocolVersion=1.8.0,
 *     ComponentSWCVName=external, ComponentSWCVId=1.8.0, direction=Sender,
 *     proxyType=none, Description="", location_id="", proxyPort="",
 *     proxyHost="", system=EventMesh,
 *     destinationName={{QUEUNAME}}, host={{EMHOST}}, port={{EMPORT}},
 *     path={{EMPATH}}, authentication={{EMAUTH}}, credentialName={{EMUser}},
 *     connectWithTLS={{EMTLS}}, disableReplyTo={{EMREPLYTO}},
 *     NumberConcurrentProcesses={{EMConcurrent}}, maxRetries={{EMMAXRETRIES}},
 *     queuePrefetch={{EMMAXMSGSPULL}}, consumeExpiredMessages={{EMConsumeEXPIRY}},
 *     deliveryState={{EMMAXStatus}}
 *   cmdVariantUri: ctype::AdapterVariant/cname::sap:AMQP/tp::WS/mp::AMQP1.0/direction::Sender/version::1.7.0
 *
 *   NOTE the confirmed asymmetry, preserved exactly and not normalized: the
 *   cmdVariantUri version suffix (1.7.0) matches componentVersion (1.7),
 *   while TransportProtocolVersion/MessageProtocolVersion/ComponentSWCVId
 *   are the DIFFERENT value 1.8.0 -- the same shape of asymmetry already
 *   confirmed for JMS's Sender (JmsAdapter.ts).
 *
 *   parameters.propdef confirms exactly these 13 properties are
 *   externalizable (attribute_category="EventMesh"/"EventMesh.Auth"):
 *   destinationName, host, port (xsd:integer), path, authentication
 *   (xsd:string, UI combobox), credentialName, connectWithTLS (xsd:boolean),
 *   disableReplyTo (xsd:boolean), NumberConcurrentProcesses (xsd:integer),
 *   maxRetries (xsd:integer), queuePrefetch (xsd:integer),
 *   consumeExpiredMessages (xsd:boolean), deliveryState (xsd:string, UI
 *   combobox). No exchange/routingKey/virtualHost/username/password/
 *   connectionFactory property exists anywhere in this export -- those are
 *   RabbitMQ (AMQP 0.9.1) concepts, not present in this SAP Event Mesh
 *   (AMQP 1.0) reference, and are therefore NOT modeled here.
 *
 *   REVISED after live SAP Integration Suite validation (the "SAP validates,
 *   compiler refines" loop this project's CLAUDE.md describes): importing a
 *   generated flow surfaced three real SAP-side errors --
 *   "Attribute 'Host' is mandatory", "Attribute 'Credential Name' is
 *   mandatory", "Enter a value between 1 and 65535" (Port) -- proving
 *   `host`/`port`/`credentialName` are genuinely REQUIRED, non-empty,
 *   schema-validated attributes on SAP's own AMQP adapter, not merely
 *   optional connection details. The original design (defaulting all three
 *   to `""` when omitted) was wrong; they are now required inputs, exactly
 *   like `destinationName`.
 *
 *   `host`/`path`/`authentication`/`credentialName`/`deliveryState` still
 *   have no generic-safe LITERAL default: their evidenced example values
 *   (e.g. "enterprise-messaging-messaging-gateway.cfapps.eu10.hana.ondemand.com",
 *   "Transport_OAuth2") are clearly this one tenant's specific Event Mesh
 *   instance/credential/workflow data, not a sensible universal default for
 *   every future flow. But the reference ZIP itself never leaves these
 *   fields blank either -- it uses SAP's own "externalize as parameter"
 *   placeholder syntax (`{{EMHOST}}`, `{{EMPORT}}`, `{{EMUser}}`), which is
 *   confirmed to satisfy SAP's design-time mandatory/format validation
 *   (this reference flow was successfully exported from a live tenant with
 *   exactly this syntax in these exact fields) while leaving the real value
 *   to be supplied per-environment later (Configure > Externalized
 *   Parameters). So: `host`/`port`/`credentialName` are REQUIRED inputs,
 *   but a caller who doesn't know the real infrastructure value may
 *   explicitly supply a `{{PlaceholderName}}`-shaped string instead of a
 *   literal one -- for `port` specifically, that placeholder form is the
 *   ONLY way to satisfy the numeric-range check without a real number,
 *   mirroring how SAP itself skips format validation for externalized
 *   fields. A silently-defaulted empty string is never produced again.
 *
 *   `connectWithTLS`/`disableReplyTo`/`numberConcurrentProcesses`/
 *   `maxRetries`/`queuePrefetch`/`consumeExpiredMessages` remain optional,
 *   generic tuning/safety knobs (not tenant-specific secrets), so their
 *   evidenced example values are still used as defaults, matching how
 *   JdbcAdapter defaults connectionTimeout/queryTimeout/maxRecords.
 *
 *   Boolean serialization: every boolean-shaped AMQP property in this
 *   export is externalized (a `{{...}}` parameter placeholder), so there is
 *   no direct evidence of AMQP's own inline literal encoding the way JMS's
 *   confirmed "1"/"0" convention was found. This compiler follows its
 *   dominant convention (HttpAdapter/JdbcAdapter/ProcessDirectAdapter/
 *   RfcAdapter all use "true"/"false") absent contradicting evidence for
 *   AMQP specifically.
 *
 *   `location_id` (Cloud Connector Location ID), `proxyType`/`proxyHost`/
 *   `proxyPort` are NOT exposed as configurable -- they are fixed at their
 *   evidenced literal values ("", "", "none", "", "") since nothing in this
 *   export shows them ever being externalized or non-empty.
 */

const SUPPORTED_SENDER_KEYS = [
    "name",
    "destinationName",
    "system",
    "host",
    "port",
    "path",
    "authentication",
    "credentialName",
    "connectWithTLS",
    "disableReplyTo",
    "numberConcurrentProcesses",
    "maxRetries",
    "queuePrefetch",
    "consumeExpiredMessages",
    "deliveryState"
];

export interface AmqpSenderConfig {
    /** Display name for the adapter/participant (defaults to "AMQP") */
    name?: string;
    /** AMQP destination (queue or topic address) to consume from (required). */
    destinationName: string;
    /** Name of the sender system shown in the collaboration diagram (defaults to name) */
    system?: string;
    /**
     * Event Mesh messaging gateway host (required -- SAP: "Attribute 'Host'
     * is mandatory"). No generic literal default -- tenant-specific. If the
     * real value isn't known at generation time, supply a SAP-style
     * "{{PlaceholderName}}" externalized-parameter string instead of a
     * literal host (see class doc).
     */
    host: string;
    /**
     * Event Mesh messaging gateway port (required -- SAP: "Enter a value
     * between 1 and 65535"). Must be a number in [1, 65535], OR a
     * "{{PlaceholderName}}" externalized-parameter string if the real value
     * isn't known at generation time (see class doc).
     */
    port: number | string;
    /** WebSocket path (e.g. "/protocols/amqp10ws"). No generic default -- tenant-specific. */
    path?: string;
    /** Authentication method name (SAP UI presents this as a dropdown; no closed set evidenced). No generic default. */
    authentication?: string;
    /**
     * Credential name configured in SAP Integration Suite (required -- SAP:
     * "Attribute 'Credential Name' is mandatory"). No generic literal
     * default -- tenant-specific. If the real value isn't known at
     * generation time, supply a "{{PlaceholderName}}" externalized-parameter
     * string instead (see class doc).
     */
    credentialName: string;
    /** SAP default: true */
    connectWithTLS?: boolean;
    /** SAP default: false */
    disableReplyTo?: boolean;
    /** SAP default: 1 */
    numberConcurrentProcesses?: number;
    /** SAP default: 1 */
    maxRetries?: number;
    /** SAP default: 5 */
    queuePrefetch?: number;
    /** SAP default: false */
    consumeExpiredMessages?: boolean;
    /** Delivery state on failure (SAP UI presents this as a dropdown; no closed set evidenced). No generic default. */
    deliveryState?: string;
}

/**
 * SAP's own "externalize as parameter" placeholder syntax, e.g.
 * "{{EMHOST}}", "{{EMPORT}}" -- confirmed by amqp_reference.zip to satisfy
 * SAP's design-time mandatory/format validation for these exact fields
 * (host/port/credentialName) while deferring the real value to
 * per-environment configuration after import.
 */
const PLACEHOLDER_PATTERN = /^\{\{.+\}\}$/;

function isPlaceholder(value: unknown): value is string {
    return typeof value === 'string' && PLACEHOLDER_PATTERN.test(value.trim());
}

function assertSupportedKeys(config: Record<string, any>): void {
    const unsupported = Object.keys(config).filter(key => !SUPPORTED_SENDER_KEYS.includes(key));
    if (unsupported.length > 0) {
        throw new Error(
            `Unsupported AMQP property/properties: ${unsupported.join(', ')}. ` +
            `Supported properties: ${SUPPORTED_SENDER_KEYS.filter(k => k !== 'name').join(', ')}.`
        );
    }
}

/**
 * Validates and normalizes the `port` config value to the exact string
 * written into the .iflw. Accepts either a real port number in [1, 65535]
 * or a "{{PlaceholderName}}" externalized-parameter string (see class doc
 * for why that bypasses the numeric range check, matching SAP's own
 * behavior for externalized fields).
 */
function resolvePort(port: number | string | undefined): string {
    if (port === undefined || port === null || String(port).trim().length === 0) {
        throw new Error('AMQP adapter requires port property');
    }
    if (isPlaceholder(port)) {
        return String(port).trim();
    }
    const numericPort = typeof port === 'number' ? port : Number(port);
    if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
        throw new Error(`AMQP port must be between 1 and 65535 (got: ${JSON.stringify(port)})`);
    }
    return numericPort.toString();
}

export class AmqpAdapter {
    public readonly name: string;
    public readonly direction: "Sender" = "Sender";
    public readonly properties: Record<string, any>;

    constructor(name: string, properties: Record<string, any> = {}) {
        this.name = name;
        this.properties = {
            ComponentType: "AMQP",
            ComponentNS: "sap",
            TransportProtocol: "WS",
            MessageProtocol: "AMQP1.0",
            ...properties
        };
    }

    /**
     * Creates an AMQP Sender adapter (consumes messages from an SAP Event
     * Mesh queue/topic, triggering the flow).
     */
    static sender(config: AmqpSenderConfig): AmqpAdapter {
        assertSupportedKeys(config);

        if (!config.destinationName || String(config.destinationName).trim().length === 0) {
            throw new Error('AMQP adapter requires destinationName property');
        }
        if (!config.host || String(config.host).trim().length === 0) {
            throw new Error('AMQP configuration requires Host.');
        }
        if (!config.credentialName || String(config.credentialName).trim().length === 0) {
            throw new Error('AMQP configuration requires Credential Name.');
        }
        const resolvedPort = resolvePort(config.port);

        const displayName = config.name || "AMQP";
        const channelName = toXmlTechnicalName(displayName, "AMQP");
        const systemName = toXmlTechnicalName(config.system || displayName, "AMQP");

        const properties: Record<string, any> = {
            Description: "",
            location_id: "",
            Name: channelName,
            TransportProtocolVersion: "1.8.0",
            ComponentSWCVName: "external",
            path: config.path ?? "",
            proxyPort: "",
            destinationName: config.destinationName,
            host: config.host,
            ComponentSWCVId: "1.8.0",
            direction: "Sender",
            authentication: config.authentication ?? "",
            disableReplyTo: String(config.disableReplyTo ?? false),
            NumberConcurrentProcesses: (config.numberConcurrentProcesses ?? 1).toString(),
            proxyType: "none",
            componentVersion: "1.7",
            proxyHost: "",
            connectWithTLS: String(config.connectWithTLS ?? true),
            maxRetries: (config.maxRetries ?? 1).toString(),
            system: systemName,
            queuePrefetch: (config.queuePrefetch ?? 5).toString(),
            port: resolvedPort,
            deliveryState: config.deliveryState ?? "",
            consumeExpiredMessages: String(config.consumeExpiredMessages ?? false),
            credentialName: config.credentialName,
            MessageProtocolVersion: "1.8.0"
        };

        return new AmqpAdapter(channelName, properties);
    }

    public isSender(): boolean {
        return true;
    }

    public isReceiver(): boolean {
        return false;
    }

    public getCmdVariantUri(): string {
        return "ctype::AdapterVariant/cname::sap:AMQP/tp::WS/mp::AMQP1.0/direction::Sender/version::1.7.0";
    }
}
