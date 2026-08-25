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
 *   `host`/`port`/`path`/`authentication`/`credentialName`/`deliveryState`
 *   have no generic-safe default: their evidenced values
 *   (e.g. "enterprise-messaging-messaging-gateway.cfapps.eu10.hana.ondemand.com",
 *   "Transport_OAuth2", "REJECTED") are clearly this one tenant's specific
 *   Event Mesh instance/credential/workflow data, not a sensible universal
 *   default -- left empty ("") when not configured, matching the evidenced
 *   empty-string convention already used for proxyPort/proxyHost/location_id
 *   in the same messageFlow. `connectWithTLS`/`disableReplyTo`/
 *   `numberConcurrentProcesses`/`maxRetries`/`queuePrefetch`/
 *   `consumeExpiredMessages` ARE generic tuning/safety knobs (not
 *   tenant-specific secrets), so their evidenced example values are used as
 *   defaults, matching how JdbcAdapter defaults connectionTimeout/
 *   queryTimeout/maxRecords.
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
    /** Event Mesh messaging gateway host. No generic default -- tenant-specific. */
    host?: string;
    /** Event Mesh messaging gateway port. No generic default -- tenant-specific. */
    port?: number;
    /** WebSocket path (e.g. "/protocols/amqp10ws"). No generic default -- tenant-specific. */
    path?: string;
    /** Authentication method name (SAP UI presents this as a dropdown; no closed set evidenced). No generic default. */
    authentication?: string;
    /** Credential name configured in SAP Integration Suite. No generic default -- tenant-specific. */
    credentialName?: string;
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

function assertSupportedKeys(config: Record<string, any>): void {
    const unsupported = Object.keys(config).filter(key => !SUPPORTED_SENDER_KEYS.includes(key));
    if (unsupported.length > 0) {
        throw new Error(
            `Unsupported AMQP property/properties: ${unsupported.join(', ')}. ` +
            `Supported properties: ${SUPPORTED_SENDER_KEYS.filter(k => k !== 'name').join(', ')}.`
        );
    }
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
            host: config.host ?? "",
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
            port: config.port !== undefined ? config.port.toString() : "",
            deliveryState: config.deliveryState ?? "",
            consumeExpiredMessages: String(config.consumeExpiredMessages ?? false),
            credentialName: config.credentialName ?? "",
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
