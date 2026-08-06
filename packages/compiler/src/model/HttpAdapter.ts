/**
 * HttpAdapter - HTTP/HTTPS adapter for sending/receiving messages
 *
 * HTTP adapters connect integration flows to external HTTP endpoints.
 * They can act as:
 * - Sender: Expose endpoint that receives HTTP requests (HTTPS recommended)
 * - Receiver: Send HTTP requests to external systems
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow> with ComponentType="HTTP" or "HTTPS"
 * - Sender connects Participant → StartEvent
 * - Receiver connects EndEvent → Participant
 *
 * Architecture:
 * - Not a Component (doesn't extend Component)
 * - Represents adapter configuration
 * - Mapped to BpmnMessageFlow in IR
 *
 * Example usage:
 * ```typescript
 * // HTTPS Sender - expose endpoint
 * const sender = HttpAdapter.sender({
 *     name: "HTTPS Sender",
 *     address: "/api/orders",
 *     protocol: "HTTPS",
 *     allowedMethods: ["POST", "GET"]
 * });
 * flow.setSender(sender);
 *
 * // HTTP Receiver - call external API
 * const receiver = HttpAdapter.receiver({
 *     name: "HTTP Receiver",
 *     url: "https://api.example.com/orders",
 *     method: "POST",
 *     authentication: "Basic",
 *     credentialName: "API_CREDS"
 * });
 * flow.setReceiver(receiver);
 * ```
 *
 * SAP Evidence:
 * - HTTPS Sender: IPRO.iflw lines 608-670
 * - HTTP Receiver: IPRO.iflw lines 188-362
 * - cmdVariantUri format:
 *   - Sender: ctype::AdapterVariant/cname::sap:HTTPS/tp::HTTPS/mp::None/direction::Sender/version::1.5.2
 *   - Receiver: ctype::AdapterVariant/cname::sap:HTTP/tp::HTTP/mp::None/direction::Receiver/version::1.16.1
 */
export class HttpAdapter {
    public readonly name: string;
    public readonly direction: "Sender" | "Receiver";
    public readonly protocol: "HTTP" | "HTTPS";
    public readonly properties: Record<string, any>;

    /**
     * Creates a new HTTP adapter
     *
     * @param name - Display name
     * @param direction - Sender or Receiver
     * @param protocol - HTTP or HTTPS
     * @param properties - Adapter-specific properties
     */
    constructor(
        name: string,
        direction: "Sender" | "Receiver",
        protocol: "HTTP" | "HTTPS" = "HTTPS",
        properties: Record<string, any> = {}
    ) {
        this.name = name;
        this.direction = direction;
        this.protocol = protocol;
        this.properties = {
            ComponentType: protocol,
            TransportProtocol: protocol,
            ComponentNS: "sap",
            MessageProtocol: "None",
            ...properties
        };
    }

    /**
     * Creates an HTTPS Sender adapter (exposes endpoint)
     *
     * @param config - Sender configuration
     * @returns HttpAdapter configured as HTTPS Sender
     */
    static sender(config: {
        name?: string;
        address: string;
        protocol?: "HTTP" | "HTTPS";
        allowedMethods?: string[];
        authentication?: "None" | "Basic" | "ClientCertificate" | "RoleBased";
        userRole?: string;
        maximumBodySize?: number;
    }): HttpAdapter {
        const protocol = config.protocol || "HTTPS";
        const allowedMethods = config.allowedMethods || ["POST"];

        const adapterDisplayName = config.name || `${protocol} Sender`;
        const adapterNCName = adapterDisplayName.replace(/\s+/g, '');  // Remove spaces for XML NCName
        const version = protocol === "HTTPS" ? "1.5.2" : "1.16.1";
        const compVersion = protocol === "HTTPS" ? "1.5" : "1.16";

        return new HttpAdapter(
            adapterNCName,  // Use NCName for messageFlow name attribute
            "Sender",
            protocol,
            {
                urlPath: config.address,
                allowedMethods: allowedMethods.join(","),
                senderAuthType: config.authentication || "RoleBased",
                userRole: config.userRole || "ESBMessaging.send",
                maximumBodySize: config.maximumBodySize?.toString() || "40",
                xsrfProtection: "0",
                system: "Sender",
                Name: adapterDisplayName,  // Use display name with spaces for Name property
                Description: "",
                TransportProtocolVersion: version,
                ComponentSWCVName: "external",
                ComponentSWCVId: version,
                clientCertificates: "",
                MessageProtocolVersion: version,
                componentVersion: compVersion
            }
        );
    }

    /**
     * Creates an HTTP Receiver adapter (calls external endpoint)
     *
     * @param config - Receiver configuration
     * @returns HttpAdapter configured as HTTP/HTTPS Receiver
     */
    static receiver(config: {
        name?: string;
        url?: string;
        method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        protocol?: "HTTP" | "HTTPS";
        authentication?: "None" | "Basic" | "OAuth2" | "ClientCertificate";
        credentialName?: string;
        timeout?: number;
        allowedResponseHeaders?: string;
    }): HttpAdapter {
        const protocol = config.protocol || "HTTP";

        return new HttpAdapter(
            config.name || `${protocol} Receiver`,
            "Receiver",
            protocol,
            {
                httpMethod: config.method || "POST",
                authenticationMethod: config.authentication || "None",
                credentialName: config.credentialName || "",
                timeout: config.timeout?.toString() || "60000",
                allowedResponseHeaders: config.allowedResponseHeaders || "*",
                system: "Receiver",
                MessageProtocolVersion: protocol === "HTTPS" ? "1.5.2" : "1.16.1",
                componentVersion: protocol === "HTTPS" ? "1.5" : "1.16",
                // Dynamic URL property (can be set via header)
                ...(config.url ? { staticUrl: config.url } : {})
            }
        );
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
        const version = this.protocol === "HTTPS" ? "1.5.2" : "1.16.1";
        return `ctype::AdapterVariant/cname::sap:${this.protocol}/tp::${this.protocol}/mp::None/direction::${this.direction}/version::${version}`;
    }
}
