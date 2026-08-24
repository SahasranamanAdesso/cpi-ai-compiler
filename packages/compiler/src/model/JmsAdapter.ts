import { toXmlTechnicalName } from '../utils/XmlName';

/**
 * JmsAdapter - JMS adapter for consuming from / producing to a JMS queue
 *
 * Unlike JDBC/RFC (Receiver-only) or Process Direct (both directions, but
 * ALSO has a mid-flow call component), JMS is a flow-level adapter that
 * genuinely supports BOTH directions and has NO mid-flow representation at
 * all -- evidence shows both the Sender messageFlow (Participant ->
 * StartEvent) and the Receiver messageFlow (EndEvent -> Participant) using
 * the exact same flow-level shape every other Sender/Receiver adapter in
 * this compiler uses (HTTP, SOAP, SFTP, IDoc, RFC). There is no
 * serviceTask/callActivity ExternalCall pattern for JMS anywhere in the
 * reference export, so (matching the explicit instruction not to assume
 * "JMS -> component -> receiver" is valid) this compiler does NOT model a
 * mid-flow "JmsCall" component -- only `sender`/`receiver`.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow name="JMS"> (ComponentType="JMS")
 * - TransportProtocol/MessageProtocol are both "Not Applicable" (matching
 *   Process Direct's shape, not HTTP/JDBC's protocol-named ones)
 *
 * SAP Evidence:
 * - Reference export: "Common Flow - Receive IDoc from SAP S4HANA.iflw"
 *   (jms_reference.zip)
 *
 *   Sender messageFlow "MessageFlow_39953" (sourceRef=Participant_39951
 *   "S4_JMS", targetRef=StartEvent_39952):
 *     ComponentType=JMS, ComponentNS=sap, componentVersion=1.3,
 *     TransportProtocol=Not Applicable, MessageProtocol=Not Applicable,
 *     TransportProtocolVersion=1.5.0, MessageProtocolVersion=1.5.0,
 *     ComponentSWCVName=external, ComponentSWCVId=1.5.0, direction=Sender,
 *     system=S4_JMS, QueueName_inbound={{JMS_Queue}},
 *     NumberConcurrentProcesses=1, MaxRetryInterval=60,
 *     useDeadLetterQueue=1, ExponentialBackoff=1, RetryInterval=1
 *   cmdVariantUri: ctype::AdapterVariant/cname::sap:JMS/tp::Not Applicable/mp::Not Applicable/direction::Sender/version::1.3.0
 *
 *   Receiver messageFlow "MessageFlow_39957" (sourceRef=EndEvent_2,
 *   targetRef=Participant_2 "S4_JMS"):
 *     ComponentType=JMS, ComponentNS=sap, componentVersion=1.5,
 *     TransportProtocol=Not Applicable, MessageProtocol=Not Applicable,
 *     TransportProtocolVersion=1.5.0, MessageProtocolVersion=1.5.0,
 *     ComponentSWCVName=external, ComponentSWCVId=1.5.0, direction=Receiver,
 *     system=S4_JMS, QueueName_outbound={{JMS_Queue}},
 *     UseMessageCompression=1, EncryptMessage=1,
 *     RetentionThresholdAlerting=2, ExpirationPeriod=30,
 *     TransferExchangeProperties=1
 *   cmdVariantUri: ctype::AdapterVariant/cname::sap:JMS/tp::Not Applicable/mp::Not Applicable/direction::Receiver/version::1.5.0
 *
 *   NOTE the asymmetries confirmed directly from evidence, NOT normalized
 *   away: componentVersion differs by direction (1.3 Sender / 1.5 Receiver),
 *   yet TransportProtocolVersion/MessageProtocolVersion/ComponentSWCVId are
 *   1.5.0 for BOTH directions (the Sender does NOT use 1.3.0 for these,
 *   only its own componentVersion and cmdVariantUri suffix are 1.3/1.3.0).
 *   The queue-name property key itself differs by direction:
 *   `QueueName_inbound` (Sender) vs `QueueName_outbound` (Receiver) -- both
 *   externalized under the SAME parameter key "JMS_Queue" in this export's
 *   parameters.propdef (attribute_uilabel "Queue Name"), confirming they
 *   are the one and same underlying "queue name" concept, just named
 *   differently per direction in the raw XML -- unified here as a single
 *   `queueName` config property.
 *
 *   Also confirmed from evidence: several boolean-shaped properties are
 *   serialized as the literal strings "1"/"0", NOT "true"/"false" like
 *   every other adapter in this compiler (HttpAdapter, JdbcAdapter,
 *   ProcessDirectAdapter all use "true"/"false"). This is JMS-specific and
 *   preserved exactly as evidenced, not homogenized to this compiler's
 *   usual convention.
 *
 * No other JMS property is evidenced anywhere in this export, so no other
 * property is accepted.
 */

const SUPPORTED_SENDER_KEYS = [
    "name",
    "queueName",
    "system",
    "numberConcurrentProcesses",
    "maxRetryInterval",
    "useDeadLetterQueue",
    "exponentialBackoff",
    "retryInterval"
];

const SUPPORTED_RECEIVER_KEYS = [
    "name",
    "queueName",
    "system",
    "useMessageCompression",
    "encryptMessage",
    "retentionThresholdAlerting",
    "expirationPeriod",
    "transferExchangeProperties"
];

export interface JmsSenderConfig {
    /** Display name for the adapter/participant (defaults to "JMS") */
    name?: string;
    /** JMS queue to consume from (required). Written as QueueName_inbound. */
    queueName: string;
    /** Name of the sender system shown in the collaboration diagram (defaults to name) */
    system?: string;
    /** SAP default: 1 */
    numberConcurrentProcesses?: number;
    /** SAP default: 60 */
    maxRetryInterval?: number;
    /** SAP default: true */
    useDeadLetterQueue?: boolean;
    /** SAP default: true */
    exponentialBackoff?: boolean;
    /** SAP default: 1 */
    retryInterval?: number;
}

export interface JmsReceiverConfig {
    /** Display name for the adapter/participant (defaults to "JMS") */
    name?: string;
    /** JMS queue to send to (required). Written as QueueName_outbound. */
    queueName: string;
    /** Name of the receiver system shown in the collaboration diagram (defaults to name) */
    system?: string;
    /** SAP default: true */
    useMessageCompression?: boolean;
    /** SAP default: true */
    encryptMessage?: boolean;
    /** SAP default: 2 */
    retentionThresholdAlerting?: number;
    /** SAP default: 30 */
    expirationPeriod?: number;
    /** SAP default: true */
    transferExchangeProperties?: boolean;
}

/** Evidence: several JMS boolean properties serialize as "1"/"0", not "true"/"false". */
function jmsBooleanFlag(value: boolean | undefined, defaultValue: boolean): string {
    return (value ?? defaultValue) ? "1" : "0";
}

function assertSupportedKeys(config: Record<string, any>, supportedKeys: string[], direction: string): void {
    const unsupported = Object.keys(config).filter(key => !supportedKeys.includes(key));
    if (unsupported.length > 0) {
        throw new Error(
            `Unsupported JMS ${direction} property/properties: ${unsupported.join(', ')}. ` +
            `Supported properties: ${supportedKeys.filter(k => k !== 'name').join(', ')}.`
        );
    }
}

export class JmsAdapter {
    public readonly name: string;
    public readonly direction: "Sender" | "Receiver";
    public readonly properties: Record<string, any>;

    constructor(name: string, direction: "Sender" | "Receiver", properties: Record<string, any> = {}) {
        this.name = name;
        this.direction = direction;
        this.properties = {
            ComponentType: "JMS",
            ComponentNS: "sap",
            TransportProtocol: "Not Applicable",
            MessageProtocol: "Not Applicable",
            ...properties
        };
    }

    /**
     * Creates a JMS Sender adapter (consumes messages from a queue,
     * triggering the flow).
     */
    static sender(config: JmsSenderConfig): JmsAdapter {
        assertSupportedKeys(config, SUPPORTED_SENDER_KEYS, 'Sender');

        if (!config.queueName || String(config.queueName).trim().length === 0) {
            throw new Error('JMS Sender adapter requires queueName property');
        }

        const displayName = config.name || "JMS";
        const channelName = toXmlTechnicalName(displayName, "JMS");
        const systemName = toXmlTechnicalName(config.system || displayName, "JMS");

        const properties: Record<string, any> = {
            QueueName_inbound: config.queueName,
            system: systemName,
            Name: channelName,
            Description: "",
            componentVersion: "1.3",
            NumberConcurrentProcesses: (config.numberConcurrentProcesses ?? 1).toString(),
            MaxRetryInterval: (config.maxRetryInterval ?? 60).toString(),
            useDeadLetterQueue: jmsBooleanFlag(config.useDeadLetterQueue, true),
            ExponentialBackoff: jmsBooleanFlag(config.exponentialBackoff, true),
            RetryInterval: (config.retryInterval ?? 1).toString(),
            TransportProtocolVersion: "1.5.0",
            MessageProtocolVersion: "1.5.0",
            ComponentSWCVName: "external",
            ComponentSWCVId: "1.5.0",
            direction: "Sender"
        };

        return new JmsAdapter(channelName, "Sender", properties);
    }

    /**
     * Creates a JMS Receiver adapter (sends the current message to a queue).
     */
    static receiver(config: JmsReceiverConfig): JmsAdapter {
        assertSupportedKeys(config, SUPPORTED_RECEIVER_KEYS, 'Receiver');

        if (!config.queueName || String(config.queueName).trim().length === 0) {
            throw new Error('JMS Receiver adapter requires queueName property');
        }

        const displayName = config.name || "JMS";
        const channelName = toXmlTechnicalName(displayName, "JMS");
        const systemName = toXmlTechnicalName(config.system || displayName, "JMS");

        const properties: Record<string, any> = {
            QueueName_outbound: config.queueName,
            system: systemName,
            Name: channelName,
            Description: "",
            componentVersion: "1.5",
            UseMessageCompression: jmsBooleanFlag(config.useMessageCompression, true),
            EncryptMessage: jmsBooleanFlag(config.encryptMessage, true),
            RetentionThresholdAlerting: (config.retentionThresholdAlerting ?? 2).toString(),
            ExpirationPeriod: (config.expirationPeriod ?? 30).toString(),
            TransferExchangeProperties: jmsBooleanFlag(config.transferExchangeProperties, true),
            TransportProtocolVersion: "1.5.0",
            MessageProtocolVersion: "1.5.0",
            ComponentSWCVName: "external",
            ComponentSWCVId: "1.5.0",
            direction: "Receiver"
        };

        return new JmsAdapter(channelName, "Receiver", properties);
    }

    public isSender(): boolean {
        return this.direction === "Sender";
    }

    public isReceiver(): boolean {
        return this.direction === "Receiver";
    }

    public getCmdVariantUri(): string {
        const versionSuffix = this.direction === "Sender" ? "1.3.0" : "1.5.0";
        return `ctype::AdapterVariant/cname::sap:JMS/tp::Not Applicable/mp::Not Applicable/direction::${this.direction}/version::${versionSuffix}`;
    }
}
