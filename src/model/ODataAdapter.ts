/**
 * ODataAdapter - OData adapter for SAP and external OData services
 *
 * OData adapters connect to OData-compliant services for CRUD operations.
 * Common use cases:
 * - SAP S/4HANA OData APIs
 * - SAP SuccessFactors
 * - Microsoft Dynamics
 * - Custom OData services
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow> with ComponentType="HCIOData"
 * - Supports OData V2 and V4
 * - Sender: Polling from OData service
 * - Receiver: Create, Read, Update, Delete, Query operations
 *
 * Architecture:
 * - Similar to HttpAdapter
 * - Mapped to BpmnMessageFlow in IR
 * - OData-specific properties (resource path, operation type, query options)
 *
 * Example usage:
 * ```typescript
 * // OData Receiver - Create operation
 * const receiver = ODataAdapter.receiver({
 *     name: "Create Product",
 *     resourcePath: "ProductCollection",
 *     operation: "Create",
 *     version: "V2"
 * });
 * flow.setReceiver(receiver);
 *
 * // OData Receiver - Query operation
 * const query = ODataAdapter.query({
 *     name: "Query Orders",
 *     resourcePath: "Orders",
 *     filter: "Status eq 'Open'",
 *     select: "OrderID,Customer,Amount"
 * });
 * ```
 *
 * SAP Evidence:
 * - OData V2 Receiver: POC.iflw lines 210-360
 * - ComponentType: "HCIOData"
 * - cmdVariantUri: ctype::AdapterVariant/cname::sap:HCIOData/tp::HTTP/mp::OData V2/direction::Receiver/version::1.30.1
 */
export class ODataAdapter {
    public readonly name: string;
    public readonly direction: "Sender" | "Receiver";
    public readonly version: "V2" | "V4";
    public readonly properties: Record<string, any>;

    /**
     * Creates a new OData adapter
     *
     * @param name - Display name
     * @param direction - Sender or Receiver
     * @param version - OData version (V2 or V4)
     * @param properties - Adapter-specific properties
     */
    constructor(
        name: string,
        direction: "Sender" | "Receiver",
        version: "V2" | "V4" = "V2",
        properties: Record<string, any> = {}
    ) {
        this.name = name;
        this.direction = direction;
        this.version = version;
        this.properties = {
            ComponentType: "HCIOData",
            TransportProtocol: "HTTP",
            ComponentNS: "sap",
            MessageProtocol: `OData ${version}`,
            ...properties
        };
    }

    /**
     * Creates an OData Receiver adapter
     *
     * @param config - Receiver configuration
     * @returns ODataAdapter configured as Receiver
     */
    static receiver(config: {
        name: string;
        resourcePath: string;
        operation: "Create" | "Read" | "Update" | "Delete" | "Query";
        version?: "V2" | "V4";
        authentication?: "None" | "Basic" | "OAuth2" | "ClientCertificate";
        credentialName?: string;
        timeout?: number;
        filter?: string;
        select?: string;
        expand?: string;
        top?: number;
        skip?: number;
    }): ODataAdapter {
        const version = config.version || "V2";

        const properties: Record<string, any> = {
            odataResourcePath: config.resourcePath,
            odataOperationType: config.operation,
            odataConnectionTimeout: config.timeout?.toString() || "60000",
            authenticationMethod: config.authentication || "None",
            credentialName: config.credentialName || "",
            system: "Receiver",
            MessageProtocolVersion: version === "V2" ? "1.30.1" : "1.0.0",
            componentVersion: version === "V2" ? "1.30" : "1.0"
        };

        // Add query options for Query operation
        if (config.operation === "Query") {
            if (config.filter) properties.odataFilter = config.filter;
            if (config.select) properties.odataSelect = config.select;
            if (config.expand) properties.odataExpand = config.expand;
            if (config.top) properties.odataTop = config.top.toString();
            if (config.skip) properties.odataSkip = config.skip.toString();
        }

        return new ODataAdapter(
            config.name,
            "Receiver",
            version,
            properties
        );
    }

    /**
     * Creates an OData Sender adapter (polling)
     *
     * @param config - Sender configuration
     * @returns ODataAdapter configured as Sender
     */
    static sender(config: {
        name: string;
        resourcePath: string;
        version?: "V2" | "V4";
        pollingInterval?: number;
        authentication?: "None" | "Basic" | "OAuth2";
        credentialName?: string;
        filter?: string;
        select?: string;
    }): ODataAdapter {
        const version = config.version || "V2";

        return new ODataAdapter(
            config.name,
            "Sender",
            version,
            {
                odataResourcePath: config.resourcePath,
                odataOperationType: "Query",
                pollingInterval: config.pollingInterval?.toString() || "60000",
                authenticationMethod: config.authentication || "None",
                credentialName: config.credentialName || "",
                odataFilter: config.filter || "",
                odataSelect: config.select || "",
                system: "Sender",
                MessageProtocolVersion: version === "V2" ? "1.30.1" : "1.0.0",
                componentVersion: version === "V2" ? "1.30" : "1.0"
            }
        );
    }

    /**
     * Creates an OData Query adapter with simplified query options
     *
     * @param config - Query configuration
     * @returns ODataAdapter configured for Query operation
     */
    static query(config: {
        name: string;
        resourcePath: string;
        filter?: string;
        select?: string;
        expand?: string;
        top?: number;
        skip?: number;
        orderBy?: string;
        version?: "V2" | "V4";
    }): ODataAdapter {
        return ODataAdapter.receiver({
            name: config.name,
            resourcePath: config.resourcePath,
            operation: "Query",
            version: config.version,
            filter: config.filter,
            select: config.select,
            expand: config.expand,
            top: config.top,
            skip: config.skip
        });
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
     * Gets the cmdVariantUri for this adapter
     *
     * @returns SAP cmdVariantUri string
     */
    public getCmdVariantUri(): string {
        const versionNum = this.version === "V2" ? "1.30.1" : "1.0.0";
        return `ctype::AdapterVariant/cname::sap:HCIOData/tp::HTTP/mp::OData ${this.version}/direction::${this.direction}/version::${versionNum}`;
    }

    /**
     * Gets the operation type
     *
     * @returns OData operation type
     */
    public getOperation(): string {
        return this.properties.odataOperationType || "Query";
    }
}
