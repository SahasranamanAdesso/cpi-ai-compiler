import { IFlow } from "../src/model/IFlow";
import { SftpAdapter } from "../src/model/SftpAdapter";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * SFTP Adapter Example - Poll CSV files from partner SFTP server
 *
 * Flow structure:
 *   SFTP Sender (poll CSV files from /incoming/orders)
 *       ↓
 *   Content Modifier (log file info)
 *       ↓
 *   Content Modifier (process CSV data)
 *       ↓
 *   HTTP Receiver (send to processing endpoint)
 *
 * SAP Evidence: SFDP_SOAP_IDOC.iflw lines 244-456
 */
async function generateSftpAdapterDemo() {
    console.log("🚀 Generating SFTP Adapter Integration Flow...\n");

    const flow = new IFlow("SftpAdapterDemo");

    // Configure SFTP Sender - poll CSV files
    const sender = SftpAdapter.sender({
        name: "Poll Orders from Partner SFTP",
        host: "sftp.partner.com",
        port: 22,
        directory: "/incoming/orders",
        filePattern: "ORDER_*.csv",
        credentialName: "Partner_SFTP_Credentials",
        authentication: "User Credentials",
        pollingInterval: "0 */10 * * * ?", // Every 10 minutes
        maxMessagesPerPoll: 50,
        postProcessing: "Archive File",
        archiveDirectory: "/archive",
        sorting: "Date"
    });
    flow.setSender(sender);

    console.log("✅ SFTP Sender configured");
    console.log(`   - Host: sftp.partner.com:22`);
    console.log(`   - Directory: /incoming/orders`);
    console.log(`   - Pattern: ORDER_*.csv`);
    console.log(`   - Polling: Every 10 minutes`);
    console.log(`   - Post-processing: Archive to /archive\n`);

    // Log file details
    const logFileInfo = new Component(
        "CallActivity_1",
        "Log File Information",
        "Enricher",
        {
            propertyTable: `<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>\${header.CamelFileName}</cell><cell id='Name'>FileName</cell></row><row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>\${header.CamelFileLength}</cell><cell id='Name'>FileSize</cell></row>`
        }
    );
    flow.addComponent(logFileInfo);

    // Process CSV content
    const processCSV = new Component(
        "CallActivity_2",
        "Process CSV Data",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${body}</cell><cell id='Name'>CSVContent</cell></row><row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>PROCESSED</cell><cell id='Name'>ProcessingStatus</cell></row>"
        }
    );
    flow.addComponent(processCSV);
    flow.connect(logFileInfo, processCSV);

    console.log("✅ Domain model created");
    console.log(`   - Components: Log File Info + Process CSV\n`);

    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    const tempDir = path.join(os.tmpdir(), 'SftpAdapterDemo');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "SftpAdapterDemo");
    console.log("✅ Serialized to .iflw\n");

    const outputZip = path.join(process.cwd(), 'SftpAdapterDemo.zip');
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "SftpAdapterDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    console.log("=".repeat(60));
    console.log("📦 SFTP ADAPTER DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nSFTP Sender Configuration:");
    console.log("   ✓ Host: sftp.partner.com");
    console.log("   ✓ Port: 22");
    console.log("   ✓ Directory: /incoming/orders");
    console.log("   ✓ File Pattern: ORDER_*.csv");
    console.log("   ✓ Authentication: User Credentials");
    console.log("   ✓ Credential: Partner_SFTP_Credentials");
    console.log("   ✓ Polling: Every 10 minutes (0 */10 * * * ?)");
    console.log("   ✓ Max Files Per Poll: 50");
    console.log("   ✓ Post-Processing: Archive File");
    console.log("   ✓ Archive Directory: /archive");
    console.log("   ✓ File Sorting: Date");
    console.log("\nNext steps:");
    console.log("1. Import SftpAdapterDemo.zip into SAP Integration Suite");
    console.log("2. Configure actual SFTP credentials");
    console.log("3. Update host, directory, file pattern");
    console.log("4. Deploy and test file polling");
    console.log("=".repeat(60));

    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateSftpAdapterDemo().catch(error => {
    console.error("❌ Error generating SFTP Adapter demo:", error);
    process.exit(1);
});
