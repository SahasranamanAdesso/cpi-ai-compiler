/**
 * SftpAdapter - SFTP adapter for secure file transfer
 *
 * SFTP (SSH File Transfer Protocol) adapters enable secure file exchange
 * with external SFTP servers. Common use cases:
 * - Poll files from partner SFTP servers
 * - Upload files to external systems
 * - Archive processed files
 *
 * In SAP Integration Suite:
 * - BPMN element: <bpmn2:messageFlow> with ComponentType="SFTP"
 * - Sender: Poll files from SFTP server
 * - Receiver: Upload files to SFTP server
 *
 * Example usage:
 * ```typescript
 * // SFTP Sender - poll CSV files
 * const sender = SftpAdapter.sender({
 *     name: "Poll Orders from Partner",
 *     host: "sftp.partner.com",
 *     port: 22,
 *     directory: "/incoming/orders",
 *     filePattern: "*.csv",
 *     credentialName: "SFTP_Partner_Creds"
 * });
 * flow.setSender(sender);
 *
 * // SFTP Receiver - upload processed files
 * const receiver = SftpAdapter.receiver({
 *     name: "Upload to Archive",
 *     host: "archive.company.com",
 *     directory: "/archive/processed",
 *     fileName: "processed_${date:now:yyyyMMdd}.xml"
 * });
 * flow.setReceiver(receiver);
 * ```
 *
 * SAP Evidence:
 * - SFTP Sender: SFDP_SOAP_IDOC.iflw lines 244-456
 * - cmdVariantUri: ctype::AdapterVariant/cname::sap:SFTP/tp::SFTP/mp::File/direction::Sender/version::1.20.1
 */
export class SftpAdapter {
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
        // Match SAP property order: ComponentType first, then spread adapter properties
        // TransportProtocol and MessageProtocol should be in the spread, not here
        this.properties = {
            ComponentType: "SFTP",
            ComponentNS: "sap",
            ...properties
        };
    }

    /**
     * Creates an SFTP Sender adapter (polls files from SFTP server)
     */
    static sender(config: {
        name?: string;
        host: string;
        port?: number;
        directory: string;
        filePattern?: string;
        credentialName: string;
        authentication?: "Public Key" | "User Credentials";
        privateKeyAlias?: string;
        pollingInterval?: string;
        maxMessagesPerPoll?: number;
        postProcessing?: "Delete File" | "Archive File" | "Mark as Read";
        archiveDirectory?: string;
        sorting?: "None" | "Name" | "Size" | "Date";
    }): SftpAdapter {
        const adapterName = config.name || "SFTP Sender";
        return new SftpAdapter(
            adapterName,
            "Sender",
            {
                // Metadata first (SAP pattern)
                Description: "",
                Name: adapterName,
                // Adapter configuration
                host: config.host,
                port: (config.port || 22).toString(),
                credential_name: config.credentialName,
                authentication: config.authentication || "User Credentials",
                privateKeyAlias: config.privateKeyAlias || "",
                connectTimeout: "10000",
                path: config.directory,
                fileName: config.filePattern || "*",
                fileType: "binary",
                file_sorting_criteria: config.sorting || "None",
                scheduleKey: config.pollingInterval || "0 */5 * * * ?",
                maxMessagesPerPoll: (config.maxMessagesPerPoll || 20).toString(),
                postProcessing: config.postProcessing || "Delete File",
                archiveDirectory: config.archiveDirectory || "",
                disconnect: "1",
                maximumFileSize: "40",
                emptyFileHandling: "processFile",
                flatten: "0",
                useClusterLock: "1",
                fastExistsCheck: "1",
                allowDeprecatedAlgorithms: "0",
                // System properties
                system: "Sender",
                // Protocols (late, matching SAP pattern)
                TransportProtocol: "SFTP",
                MessageProtocol: "File",
                // Version properties
                componentVersion: "1.20",
                ComponentSWCVId: "1.20.1",
                ComponentSWCVName: "external",
                MessageProtocolVersion: "1.20.1",
                TransportProtocolVersion: "1.20.1",
                // Direction last
                direction: "Sender"
            }
        );
    }

    /**
     * Creates an SFTP Receiver adapter (uploads files to SFTP server)
     */
    static receiver(config: {
        name?: string;
        host: string;
        port?: number;
        directory: string;
        fileName: string;
        credentialName: string;
        authentication?: "Public Key" | "User Credentials";
        privateKeyAlias?: string;
        fileExists?: "Append" | "Fail" | "Ignore" | "Override";
        createDirectory?: boolean;
    }): SftpAdapter {
        const adapterName = config.name || "SFTP Receiver";
        return new SftpAdapter(
            adapterName,
            "Receiver",
            {
                Name: adapterName,
                Description: "",
                host: config.host,
                port: (config.port || 22).toString(),
                directory: config.directory,
                fileName: config.fileName,
                credential_name: config.credentialName,
                authentication: config.authentication || "User Credentials",
                privateKeyAlias: config.privateKeyAlias || "",
                fileExists: config.fileExists || "Override",
                createDirectory: config.createDirectory === false ? "0" : "1",
                connectTimeout: "10000",
                disconnect: "1",
                allowDeprecatedAlgorithms: "0",
                system: "Receiver",
                direction: "Receiver",
                componentVersion: "1.20",
                ComponentSWCVId: "1.20.1",
                ComponentSWCVName: "external",
                MessageProtocolVersion: "1.20.1",
                TransportProtocolVersion: "1.20.1"
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
        return `ctype::AdapterVariant/cname::sap:SFTP/tp::SFTP/mp::File/direction::${this.direction}/version::1.20.1`;
    }
}
