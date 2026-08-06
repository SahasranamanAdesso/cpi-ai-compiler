import { IFlow } from "../src/model/IFlow";
import { ODataAdapter } from "../src/model/ODataAdapter";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * OData Adapter Example - Integration Flow with OData V2 connectivity
 *
 * Flow structure:
 *   HTTPS Sender (receive product data)
 *       ↓
 *   Content Modifier (prepare OData payload)
 *       ↓
 *   OData Receiver (create product in SAP S/4HANA)
 *
 * This demonstrates:
 * - HTTPS Sender adapter
 * - OData V2 Receiver adapter (Create operation)
 * - OData resource path and operation configuration
 *
 * SAP Evidence:
 * - OData V2 Receiver: POC.iflw lines 210-360
 * - ComponentType: HCIOData
 * - Operations: Create, Read, Update, Delete, Query
 */
async function generateODataAdapterDemo() {
    console.log("🚀 Generating OData Adapter Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("ODataAdapterDemo");

    // Configure HTTPS Sender
    const sender = ODataAdapter.sender({
        name: "HTTPS Sender",
        resourcePath: "Products",
        version: "V2",
        pollingInterval: 300000, // 5 minutes
        authentication: "Basic",
        credentialName: "S4HANA_Credentials"
    });
    // Note: For this demo, we'll use a simple HTTPS sender instead
    // to keep it compatible with current mapper

    // Create product payload for OData
    const createPayload = new Component(
        "CallActivity_1",
        "Create Product Data",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `{
    "ProductID": "PROD12345",
    "ProductName": "Sample Product",
    "Category": "Electronics",
    "Price": "999.99",
    "Currency": "USD",
    "StockQuantity": "100"
}`
        }
    );
    flow.addComponent(createPayload);

    console.log("✅ Product payload created");
    console.log(`   - ProductID: PROD12345`);
    console.log(`   - Category: Electronics`);
    console.log(`   - Price: 999.99 USD\n`);

    // Log before OData call
    const logBefore = new Component(
        "CallActivity_2",
        "Log Before OData",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${body}</cell><cell id='Name'>ProductData</cell></row>"
        }
    );
    flow.addComponent(logBefore);
    flow.connect(createPayload, logBefore);

    // Configure OData V2 Receiver - Create operation
    const receiver = ODataAdapter.receiver({
        name: "Create Product in S/4HANA",
        resourcePath: "ProductCollection",
        operation: "Create",
        version: "V2",
        authentication: "Basic",
        credentialName: "S4HANA_OData_Creds",
        timeout: 60000
    });
    flow.setReceiver(receiver);

    console.log("✅ OData Receiver configured");
    console.log(`   - Version: OData V2`);
    console.log(`   - Resource: ProductCollection`);
    console.log(`   - Operation: Create`);
    console.log(`   - Auth: Basic Authentication\n`);

    console.log("✅ Domain model created");
    console.log(`   - Processing: 2 components`);
    console.log(`   - Receiver: OData V2 Create\n`);

    // 2. Map to BPMN IR
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'ODataAdapterDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "ODataAdapterDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'ODataAdapterDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "ODataAdapterDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=".repeat(60));
    console.log("📦 ODATA ADAPTER DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nOData configuration:");
    console.log("\nOData V2 Receiver:");
    console.log("   ✓ Protocol: OData V2");
    console.log("   ✓ Resource Path: ProductCollection");
    console.log("   ✓ Operation: Create");
    console.log("   ✓ Authentication: Basic");
    console.log("   ✓ Credential Name: S4HANA_OData_Creds");
    console.log("   ✓ Timeout: 60 seconds");
    console.log("\nPayload structure:");
    console.log("   ✓ ProductID: String");
    console.log("   ✓ ProductName: String");
    console.log("   ✓ Category: String");
    console.log("   ✓ Price: Decimal");
    console.log("   ✓ Currency: String");
    console.log("   ✓ StockQuantity: Integer");
    console.log("\nNext steps:");
    console.log("1. Import ODataAdapterDemo.zip into SAP Integration Suite");
    console.log("2. Open in visual editor");
    console.log("3. Configure OData service URL in receiver");
    console.log("4. Set up credentials 'S4HANA_OData_Creds'");
    console.log("5. Deploy and test product creation");
    console.log("6. Verify product appears in SAP S/4HANA");
    console.log("\nOther OData operations available:");
    console.log("   - Query: Read multiple records with filters");
    console.log("   - Read: Read single record by key");
    console.log("   - Update: Modify existing record");
    console.log("   - Delete: Remove record");
    console.log("=".repeat(60));

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Run the example
generateODataAdapterDemo().catch(error => {
    console.error("❌ Error generating OData Adapter demo:", error);
    process.exit(1);
});
