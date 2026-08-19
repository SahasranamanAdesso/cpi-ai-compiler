import { toXmlTechnicalName } from '../utils/XmlName';

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
 * - HTTPS Sender: IPRO.iflw lines 608-670 (ComponentType=HTTPS, componentVersion=1.5,
 *   cmdVariantUri version::1.5.2)
 * - HTTP Receiver: IPRO.iflw lines 188-362 / DISCOVERY_REPORT_PHASE3.md
 *   "Receiver Metadata (HTTP)" (ComponentType=HTTP -- NOT HTTPS, componentVersion=1.16,
 *   cmdVariantUri version::1.16.1). SAP Cloud Integration has no "HTTPS" component
 *   registered for the Receiver direction -- only Sender. Requesting an HTTPS
 *   receiver still produces ComponentType=HTTP (the outbound adapter handles
 *   both http:// and https:// URLs; the scheme lives in the URL, not the
 *   adapter type).
 * - cmdVariantUri format:
 *   - Sender: ctype::AdapterVariant/cname::sap:HTTPS/tp::HTTPS/mp::None/direction::Sender/version::1.5.2
 *   - Receiver: ctype::AdapterVariant/cname::sap:HTTP/tp::HTTP/mp::None/direction::Receiver/version::1.16.1
 */
/**
 * Normalizes an "array of strings" input that may arrive as a real array,
 * a single string, or a comma-separated string (as AI-generated JSON
 * frequently does not match the declared TypeScript type at runtime).
 *
 * @param value - Expected string[], but may be a string or comma-separated string
 * @param fallback - Value to use when input is missing/empty
 */
function normalizeStringArray(value: unknown, fallback: string[]): string[] {
    if (Array.isArray(value)) {
        const filtered = value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
        return filtered.length > 0 ? filtered : fallback;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
    }
    return fallback;
}

/**
 * Splits a target URL into the two properties SAP's HTTP Receiver adapter
 * actually reads for its "Address" field: the URL up to (but not including)
 * '?', and the query string separately (without the leading '?').
 *
 * Evidence: V1.2.3a_ROUTER_VALIDATION_FIX.md ("Analysis: The receiver HTTP
 * adapter requires a target address (`httpAddressWithoutQuery`) to be
 * configured" / "Cause: HTTP adapter requires `httpAddressWithoutQuery` to
 * be configured"), and the richer real-SAP-export-derived default HTTP
 * receiver block in BpmnProcessMapper.ts, which sets both
 * `httpAddressWithoutQuery` and `httpAddressQuery`. A prior version of this
 * adapter instead wrote the full URL to a `staticUrl` property, which SAP's
 * Address field does not read at all -- producing "Enter a valid address,
 * for example http(s)://example" even when a URL was supplied.
 */
function splitAddressForHttpReceiver(url: string | undefined): { withoutQuery: string; query: string } {
    const value = (url || '').trim();
    if (value.length === 0) {
        return { withoutQuery: '', query: '' };
    }
    try {
        const parsed = new URL(value);
        return {
            withoutQuery: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
            query: parsed.search ? parsed.search.slice(1) : ''
        };
    } catch {
        // Not a parseable absolute URL -- split on the first '?' manually
        // rather than dropping the value entirely.
        const [withoutQuery, query = ''] = value.split('?');
        return { withoutQuery, query };
    }
}

/**
 * Ensures an HTTPS Sender's address is a relative path beginning with "/".
 * The Cloud Integration HTTPS Sender adapter exposes an endpoint under the
 * tenant's own runtime host -- it never calls out to an external host -- so
 * SAP rejects anything else with "The address field must begin with '/'".
 * AI-generated JSON has been seen to supply a full absolute URL by mistake
 * (confusing the Sender's endpoint path with a Receiver's target URL); this
 * extracts just the path (+ query) portion instead of emitting the invalid
 * value as-is. Receiver URLs are untouched -- see HttpAdapter.receiver(),
 * which keeps the full URL in `staticUrl`.
 */
function normalizeSenderAddress(address: string | undefined): string {
    const value = (address || '').trim();
    if (value.length === 0) {
        return '/';
    }
    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            const path = `${url.pathname}${url.search}`;
            return path.startsWith('/') ? path : `/${path}`;
        } catch {
            // Not a parseable URL despite the scheme prefix -- fall through.
        }
    }
    return value.startsWith('/') ? value : `/${value}`;
}

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
        allowedMethods?: string[] | string;
        authentication?: "None" | "Basic" | "ClientCertificate" | "RoleBased";
        userRole?: string;
        maximumBodySize?: number;
    }): HttpAdapter {
        const protocol = config.protocol || "HTTPS";
        const allowedMethods = normalizeStringArray(config.allowedMethods, ["POST"]);

        const adapterDisplayName = config.name || `${protocol} Sender`;
        const adapterNCName = toXmlTechnicalName(adapterDisplayName, `${protocol}_Sender`);
        const version = protocol === "HTTPS" ? "1.5.2" : "1.16.1";
        const compVersion = protocol === "HTTPS" ? "1.5" : "1.16";

        return new HttpAdapter(
            adapterNCName,  // Use NCName for messageFlow name attribute
            "Sender",
            protocol,
            {
                urlPath: normalizeSenderAddress(config.address),
                allowedMethods: allowedMethods.join(","),
                senderAuthType: config.authentication || "RoleBased",
                userRole: config.userRole || "ESBMessaging.send",
                maximumBodySize: config.maximumBodySize?.toString() || "40",
                xsrfProtection: "0",
                system: "Sender",
                // SAP Cloud Integration also rejects whitespace in this "Name"
                // property for HTTP(S)/JDBC channels (confirmed against a live
                // tenant) -- despite VALIDATION_ERRORS_FIXED.md's earlier,
                // narrower finding that it tolerated spaces. Use the same
                // sanitized value as the channel name rather than the raw
                // display text.
                Name: adapterNCName,
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
     * Always produces ComponentType/TransportProtocol="HTTP" and version
     * 1.16/1.16.1, regardless of the requested `protocol` -- SAP Cloud
     * Integration's outbound adapter is registered only as "HTTP" (it
     * accepts both http:// and https:// target URLs via `url`, split into
     * the `httpAddressWithoutQuery`/`httpAddressQuery` properties SAP's
     * Address field actually reads). There is no separate "HTTPS" Receiver
     * component in the Cloud
     * Integration profile catalog; using ComponentType=HTTPS here produced
     * SAP's "This component HTTPS with version 1.5 is not supported in
     * Cloud Integration profile" error. Evidence: DISCOVERY_REPORT_PHASE3.md
     * "Receiver Metadata (HTTP)" (real SAP export, IPRO_PRODUCT_HTTP.iflw).
     *
     * @param config - Receiver configuration
     * @returns HttpAdapter configured as an HTTP Receiver
     */
    static receiver(config: {
        name?: string;
        url?: string;
        method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
        /** Accepted for API compatibility ("HTTPS" reads naturally when the
         *  target `url` is https://) but does NOT change the emitted
         *  ComponentType/version -- see method doc above. */
        protocol?: "HTTP" | "HTTPS";
        authentication?: "None" | "Basic" | "OAuth2" | "ClientCertificate";
        credentialName?: string;
        timeout?: number;
        allowedResponseHeaders?: string;
    }): HttpAdapter {
        const displayName = config.name || "HTTP Receiver";
        const channelName = toXmlTechnicalName(displayName, "HTTP_Receiver");
        const { withoutQuery, query } = splitAddressForHttpReceiver(config.url);

        return new HttpAdapter(
            channelName,  // Use NCName for messageFlow name attribute
            "Receiver",
            "HTTP",
            {
                httpMethod: config.method || "POST",
                authenticationMethod: config.authentication || "None",
                credentialName: config.credentialName || "",
                timeout: config.timeout?.toString() || "60000",
                allowedResponseHeaders: config.allowedResponseHeaders || "*",
                system: "Receiver",
                // See sender()'s comment: SAP rejects whitespace in this
                // "Name" property too, not just the channel name -- use the
                // same sanitized value for both.
                Name: channelName,
                Description: "",
                TransportProtocolVersion: "1.16.1",
                ComponentSWCVName: "external",
                ComponentSWCVId: "1.16.1",
                MessageProtocolVersion: "1.16.1",
                componentVersion: "1.16",
                // SAP's Address field reads these two properties, not a
                // single combined URL -- always present (empty when
                // unconfigured) to match the evidenced default block.
                httpAddressWithoutQuery: withoutQuery,
                httpAddressQuery: query
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
