/**
 * BpmnMessageFlow - Represents a BPMN 2.0 message flow (adapter connection)
 *
 * Message flows connect participants (external systems) to integration processes.
 * In SAP CPI, they represent adapters (HTTP, OData, SFTP, SOAP, etc.).
 *
 * BPMN Structure:
 * ```xml
 * <!-- Sender adapter: Participant → StartEvent -->
 * <bpmn2:messageFlow id="MessageFlow_1" sourceRef="Participant_1" targetRef="StartEvent_1">
 *   <bpmn2:extensionElements>
 *     <ifl:property><key>ComponentType</key><value>HTTPS</value></ifl:property>
 *     <ifl:property><key>TransportProtocol</key><value>HTTPS</value></ifl:property>
 *     <ifl:property><key>address</key><value>/api/data</value></ifl:property>
 *     <!-- more adapter properties -->
 *   </bpmn2:extensionElements>
 * </bpmn2:messageFlow>
 *
 * <!-- Receiver adapter: EndEvent → Participant -->
 * <bpmn2:messageFlow id="MessageFlow_2" sourceRef="EndEvent_2" targetRef="Participant_2">
 *   <bpmn2:extensionElements>
 *     <ifl:property><key>ComponentType</key><value>HTTP</value></ifl:property>
 *     <ifl:property><key>httpMethod</key><value>POST</value></ifl:property>
 *     <!-- more adapter properties -->
 *   </bpmn2:extensionElements>
 * </bpmn2:messageFlow>
 * ```
 *
 * Evidence:
 * - HTTPS Sender: IPRO.iflw lines 608-670
 * - HTTP Receiver: IPRO.iflw lines 188-362
 * - OData Receiver: POC.iflw lines 210-360
 */
export class BpmnMessageFlow {
    public readonly id: string;
    public readonly name: string;
    public readonly sourceRef: string;
    public readonly targetRef: string;
    public readonly direction: "Sender" | "Receiver";
    public readonly adapterType: string; // HTTP, HTTPS, OData, SFTP, SOAP, IDoc
    public readonly properties: Record<string, any>;

    /**
     * Creates a new BPMN message flow
     *
     * @param id - Unique message flow ID (e.g., "MessageFlow_1")
     * @param name - Display name (e.g., "HTTPS", "OData V2")
     * @param sourceRef - Source element ID (Participant for Sender, EndEvent for Receiver)
     * @param targetRef - Target element ID (StartEvent for Sender, Participant for Receiver)
     * @param direction - Adapter direction (Sender or Receiver) [optional for backwards compatibility]
     * @param adapterType - Adapter type (HTTP, HTTPS, OData, etc.) [optional for backwards compatibility]
     * @param properties - Adapter-specific properties [optional]
     */
    constructor(
        id: string,
        name: string,
        sourceRef: string,
        targetRef: string,
        direction: "Sender" | "Receiver" = "Sender",
        adapterType: string = "",
        properties: Record<string, any> = {}
    ) {
        this.id = id;
        this.name = name;
        this.sourceRef = sourceRef;
        this.targetRef = targetRef;
        this.direction = direction;
        this.adapterType = adapterType || name; // Use name as fallback
        this.properties = properties;
    }

    /**
     * Checks if this is a sender adapter
     *
     * @returns true if direction is Sender
     */
    public isSender(): boolean {
        return this.direction === "Sender";
    }

    /**
     * Checks if this is a receiver adapter
     *
     * @returns true if direction is Receiver
     */
    public isReceiver(): boolean {
        return this.direction === "Receiver";
    }

    /**
     * Gets the component type for this adapter
     *
     * @returns Component type (HTTP, HTTPS, HCIOData, etc.)
     */
    public getComponentType(): string {
        return this.properties.ComponentType || this.adapterType;
    }

    /**
     * Gets the transport protocol for this adapter
     *
     * @returns Transport protocol (HTTP, HTTPS, etc.)
     */
    public getTransportProtocol(): string {
        return this.properties.TransportProtocol || this.adapterType;
    }

    /**
     * Adds a property to the message flow
     *
     * @param key - Property key
     * @param value - Property value
     */
    public addProperty(key: string, value: any): void {
        this.properties[key] = value;
    }

    /**
     * Gets all properties
     *
     * @returns Properties object
     */
    public getProperties(): Record<string, any> {
        return this.properties;
    }
}
