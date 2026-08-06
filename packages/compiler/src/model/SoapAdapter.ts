/**
 * SoapAdapter - SOAP 1.x adapter for web service calls
 *
 * SOAP adapters enable integration with SOAP-based web services.
 * Supports SOAP 1.1 and SOAP 1.2 protocols.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow> with ComponentType="SOAP"
 * - Primarily used as Receiver to call external SOAP services
 * - Supports WS-Security (Sign, Encrypt)
 *
 * Example usage:
 * ```typescript
 * // SOAP Receiver - call SAP S/4HANA web service
 * const receiver = SoapAdapter.receiver({
 *     name: "Call S4HANA WebService",
 *     url: "https://s4hana.company.com:443/sap/bc/srt/wsdl/...",
 *     soapAction: "http://sap.com/xi/WebService/create",
 *     soapVersion: "SOAP 1.1",
 *     authentication: "Basic",
 *     credentialName: "S4HANA_User"
 * });
 * flow.setReceiver(receiver);
 * ```
 *
 * SAP Evidence:
 * - SOAP Receiver: SFDP_SOAP_IDOC.iflw lines 160-243
 * - cmdVariantUri: ctype::AdapterVariant/cname::sap:SOAP/tp::HTTP/mp::Plain SOAP/direction::Receiver/version::1.10.3
 */
export class SoapAdapter {
    public readonly name: string;
    public readonly direction: "Sender" | "Receiver";
    public readonly properties: Record<string, any>;

    constructor(
        name: string,
        direction: "Sender" | "Receiver",
        properties: Record<string, any> = {}
    ) {
        this.name = name;
        this.direction = direction;
        this.properties = {
            ComponentType: "SOAP",
            TransportProtocol: "HTTP",
            MessageProtocol: "Plain SOAP",
            ComponentNS: "sap",
            ...properties
        };
    }

    /**
     * Creates a SOAP Receiver adapter (calls SOAP web service)
     */
    static receiver(config: {
        name: string;
        url?: string;
        soapAction?: string;
        soapVersion?: "SOAP 1.1" | "SOAP 1.2";
        authentication?: "None" | "Basic" | "Client Certificate" | "OAuth2";
        credentialName?: string;
        timeout?: number;
        wsSecurity?: "None" | "Sign" | "Encrypt" | "Sign and Encrypt";
        privateKeyAlias?: string;
        proxyType?: "none" | "default" | "sapcc";
        locationId?: string;
    }): SoapAdapter {
        const soapVersion = config.soapVersion || "SOAP 1.1";

        return new SoapAdapter(
            config.name,
            "Receiver",
            {
                url: config.url || "",
                soapAction: config.soapAction || "",
                soapVersion: soapVersion,
                authentication: config.authentication || "Basic",
                credentialName: config.credentialName || "",
                timeout: (config.timeout || 60000).toString(),
                WsSecurityType: config.wsSecurity || "None",
                privateKeyAlias: config.privateKeyAlias || "",
                proxyType: config.proxyType || "none",
                locationID: config.locationId || "",
                KeepConnectionAlive: "0",
                SourceForSapRmMessageId: "",
                cleanupHeaders: "1",
                system: "Receiver",
                direction: "Receiver",
                componentVersion: "1.10",
                MessageProtocolVersion: "1.13.0",
                TransportProtocolVersion: "1.10.3"
            }
        );
    }

    /**
     * Creates a SOAP Receiver with SAP Cloud Connector proxy
     */
    static receiverWithCloudConnector(config: {
        name: string;
        url?: string;
        soapAction?: string;
        soapVersion?: "SOAP 1.1" | "SOAP 1.2";
        credentialName: string;
        locationId: string;
    }): SoapAdapter {
        return SoapAdapter.receiver({
            ...config,
            proxyType: "sapcc",
            authentication: "Basic"
        });
    }

    /**
     * Creates a SOAP Receiver with WS-Security
     */
    static receiverWithWsSecurity(config: {
        name: string;
        url?: string;
        soapAction?: string;
        wsSecurity: "Sign" | "Encrypt" | "Sign and Encrypt";
        privateKeyAlias: string;
    }): SoapAdapter {
        return SoapAdapter.receiver({
            ...config,
            authentication: "Client Certificate"
        });
    }

    public isSender(): boolean {
        return this.direction === "Sender";
    }

    public isReceiver(): boolean {
        return this.direction === "Receiver";
    }

    public getCmdVariantUri(): string {
        return `ctype::AdapterVariant/cname::sap:SOAP/tp::HTTP/mp::Plain SOAP/direction::${this.direction}/version::1.10.3`;
    }
}
