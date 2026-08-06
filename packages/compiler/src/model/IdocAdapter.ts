/**
 * IdocAdapter - SAP IDoc adapter for SAP system integration
 *
 * IDoc (Intermediate Document) adapters enable integration with SAP backend systems
 * for sending and receiving IDocs. Primarily used for SAP-to-SAP integration.
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow> with ComponentType="IDOC"
 * - MessageProtocol: "IDoc SOAP"
 * - Primarily used as Receiver to send IDocs to SAP systems
 * - Requires SAP Cloud Connector for on-premise systems
 *
 * Example usage:
 * ```typescript
 * // IDoc Receiver - send IDoc to SAP S/4HANA
 * const receiver = IdocAdapter.receiver({
 *     name: "Send IDoc to S4HANA",
 *     address: "http://s4hana:44300/sap/bc/srt/idoc?sap-client=100",
 *     credentialName: "S4HANA_Credentials",
 *     locationId: "S4HANA_CC",
 *     sapMessageIdDetermination: "Reuse"
 * });
 * flow.setReceiver(receiver);
 * ```
 *
 * SAP Evidence:
 * - IDoc Receiver: SFDP_SOAP_IDOC.iflw lines 456-600
 * - cmdVariantUri: ctype::AdapterVariant/cname::sap:IDOC/tp::HTTP/mp::IDoc SOAP/direction::Receiver/version::1.8.1
 */
export class IdocAdapter {
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
            ComponentType: "IDOC",
            TransportProtocol: "HTTP",
            MessageProtocol: "IDoc SOAP",
            ComponentNS: "sap",
            ...properties
        };
    }

    /**
     * Creates an IDoc Receiver adapter (sends IDoc to SAP system)
     */
    static receiver(config: {
        name: string;
        address: string;
        credentialName: string;
        locationId?: string;
        sapMessageIdDetermination?: "Reuse" | "Generate";
        timeout?: number;
        compressMessage?: boolean;
    }): IdocAdapter {
        return new IdocAdapter(
            config.name,
            "Receiver",
            {
                address: config.address,
                credentialName: config.credentialName,
                authentication: "Basic",
                locationID: config.locationId || "",
                SapMessageIdDetermination: config.sapMessageIdDetermination || "Reuse",
                requestTimeout: (config.timeout || 60000).toString(),
                CompressMessage: config.compressMessage ? "1" : "",
                IDocContentType: "application/x-sap.idoc",
                cleanupHeaders: "1",
                sendHttpResponseCode: "0",
                allowChunking: "1",
                proxyType: config.locationId ? "sapcc" : "none",
                system: "Receiver",
                direction: "Receiver",
                componentVersion: "1.8",
                MessageProtocolVersion: "1.8.1",
                TransportProtocolVersion: "1.8.1"
            }
        );
    }

    /**
     * Creates an IDoc Receiver with SAP Cloud Connector
     * (for on-premise SAP systems)
     */
    static receiverWithCloudConnector(config: {
        name: string;
        address: string;
        credentialName: string;
        locationId: string;
        sapClient: string;
    }): IdocAdapter {
        // Build address with SAP client if not already included
        let fullAddress = config.address;
        if (!fullAddress.includes("sap-client=")) {
            const separator = fullAddress.includes("?") ? "&" : "?";
            fullAddress = `${fullAddress}${separator}sap-client=${config.sapClient}`;
        }

        return IdocAdapter.receiver({
            name: config.name,
            address: fullAddress,
            credentialName: config.credentialName,
            locationId: config.locationId,
            sapMessageIdDetermination: "Reuse"
        });
    }

    /**
     * Creates an IDoc Sender adapter (receives IDoc from SAP system)
     * Note: Less common, typically SAP pushes IDocs to CPI via SOAP/HTTP
     */
    static sender(config: {
        name: string;
        address: string;
        credentialName: string;
    }): IdocAdapter {
        return new IdocAdapter(
            config.name,
            "Sender",
            {
                address: config.address,
                credentialName: config.credentialName,
                authentication: "Basic",
                IDocContentType: "application/x-sap.idoc",
                system: "Sender",
                direction: "Sender",
                componentVersion: "1.8",
                MessageProtocolVersion: "1.8.1",
                TransportProtocolVersion: "1.8.1"
            }
        );
    }

    public isSender(): boolean {
        return this.direction === "Sender";
    }

    public isReceiver(): boolean {
        return this.direction === "Receiver";
    }

    public getCmdVariantUri(): string {
        return `ctype::AdapterVariant/cname::sap:IDOC/tp::HTTP/mp::IDoc SOAP/direction::${this.direction}/version::1.8.1`;
    }
}
