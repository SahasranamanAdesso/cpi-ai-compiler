/**
 * SftpAdapter - SFTP adapter for secure file transfer
 *
 * Properties based on actual SAP export: SFDP_SOAP_IDOC.zip
 * MessageFlow ID: MessageFlow_1799656
 * Version: 1.20.1
 *
 * SAP Evidence:
 * - SFTP Sender: Send inbound External Stocks files from Movianto_Viadat to S4HANA.iflw
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
        this.properties = {
            ...properties
        };
    }

    /**
     * Creates an SFTP Sender adapter - EXACT SAP property order from export
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
        const adapterName = config.name || "SFTP";
        return new SftpAdapter(
            adapterName,
            "Sender",
            {
                // EXACT property order with TEMPLATE PLACEHOLDERS matching POC export
                disconnect: "{{autodisc}}",
                fileName: "{{filename}}",
                maximumFileSize: "40",
                privateKeyAlias: "{{alias}}",
                emptyFileHandling: "processFile",
                location_id: "",
                Name: "SFTP",
                TransportProtocolVersion: "1.20.1",
                flatten: "0",
                proxyPort: "8080",
                path: "{{directory}}",
                useClusterLock: "{{pollone worker}}",
                regex_filter: "0",
                host: "{{sftpAdd}}",
                connectTimeout: "{{TO}}",
                file_sorting_criteria: "{{sorting}}",
                maxMessagesPerPoll: "{{Maxpoll}}",
                fastExistsCheck: "1",
                ComponentSWCVId: "1.20.1",
                credential_name: "{{Basicuser}}",
                readLock: "none",
                componentVersion: "1.20",
                proxyHost: "",
                system: "Sender",
                stopOnException: "1",
                scheduleKey: "{{Timer}}",
                allowDeprecatedAlgorithms: "0",
                TransportProtocol: "SFTP",
                cmdVariantUri: "ctype::AdapterVariant/cname::sap:SFTP/tp::SFTP/mp::File/direction::Sender/version::1.20.1",
                MessageProtocolVersion: "1.20.1",
                file_lock_timeout: "{{LockTO}}",
                Description: "",
                readLockCheckInterval: "5000",
                maximumReconnectAttempts: "{{reconnectattempts}}",
                stepwise: "0",
                ComponentNS: "sap",
                recursive: "0",
                ComponentSWCVName: "external",
                noop: "{{PostProcessing}}",
                doneFileName: "${file:name}.done",
                "file.move": "{{archivedir}}",
                MessageProtocol: "File",
                direction: "Sender",
                authentication: "{{Auth}}",
                file_sorting_direction: "{{sortOrder}}",
                ComponentType: "SFTP",
                proxyProtocol: "socks5",
                idempotentRepository: "database",
                proxyType: "{{SFTPPT}}",
                proxyAlias: "",
                reconnectDelay: "{{reconnectdelay}}",
                username: "{{user}}"
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
