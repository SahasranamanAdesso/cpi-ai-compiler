import { IFlow } from "../src/model/IFlow";
import { HttpAdapter } from "../src/model/HttpAdapter";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * HTTP Adapter Example - Integration Flow with HTTP connectivity
 *
 * Flow structure:
 *   HTTPS Sender (expose endpoint /api/products)
 *       ↓
 *   Content Modifier (create product data)
 *       ↓
 *   HTTP Receiver (call external API)
 *
 * This demonstrates:
 * - HTTPS Sender adapter (expose endpoint)
 * - HTTP Receiver adapter (call external system)
 * - Complete adapter configuration
 *
 * SAP Evidence:
 * - HTTPS Sender: IPRO.iflw lines 608-670
 * - HTTP Receiver: IPRO.iflw lines 188-362
 */
async function generateHttpAdapterDemo() {
    console.log("🚀 Generating HTTP Adapter Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("HttpAdapterDemo");

    // Configure HTTPS Sender - expose endpoint
    const sender = HttpAdapter.sender({
        name: "HTTPS Sender",
        address: "/api/products",
        protocol: "HTTPS",
        allowedMethods: ["POST", "GET"],
        authentication: "RoleBased",
        userRole: "ESBMessaging.send"
    });
    flow.setSender(sender);

    console.log("✅ HTTPS Sender configured");
    console.log(`   - Endpoint: /api/products`);
    console.log(`   - Methods: POST, GET`);
    console.log(`   - Auth: Role-based\n`);

    // Create product payload
    const createPayload = new Component(
        "CallActivity_1",
        "Create Product Payload",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `{
    "productId": "PROD001",
    "name": "Sample Product",
    "price": 99.99,
    "category": "Electronics"
}`
        }
    );
    flow.addComponent(createPayload);

    // Log payload
    const logPayload = new Component(
        "CallActivity_2",
        "Log Request",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${body}</cell><cell id='Name'>RequestPayload</cell></row>"
        }
    );
    flow.addComponent(logPayload);
    flow.connect(createPayload, logPayload);

    // Configure HTTP Receiver - call external API
    const receiver = HttpAdapter.receiver({
        name: "HTTP Receiver",
        method: "POST",
        protocol: "HTTP",
        authentication: "Basic",
        credentialName: "API_Credentials",
        timeout: 60000,
        allowedResponseHeaders: "*"
    });
    flow.setReceiver(receiver);

    console.log("✅ HTTP Receiver configured");
    console.log(`   - Method: POST`);
    console.log(`   - Auth: Basic Authentication`);
    console.log(`   - Timeout: 60000 ms\n`);

    console.log("✅ Domain model created");
    console.log(`   - Sender: HTTPS (exposes /api/products)`);
    console.log(`   - Processing: 2 components`);
    console.log(`   - Receiver: HTTP (calls external API)\n`);

    // 2. Map to BPMN IR
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'HttpAdapterDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "HttpAdapterDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'HttpAdapterDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "HttpAdapterDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=".repeat(60));
    console.log("📦 HTTP ADAPTER DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nAdapter configuration:");
    console.log("\nHTTPS Sender:");
    console.log("   ✓ Endpoint: /api/products");
    console.log("   ✓ Methods: POST, GET");
    console.log("   ✓ Authentication: Role-based");
    console.log("   ✓ User Role: ESBMessaging.send");
    console.log("\nHTTP Receiver:");
    console.log("   ✓ Method: POST");
    console.log("   ✓ Authentication: Basic");
    console.log("   ✓ Credential: API_Credentials");
    console.log("   ✓ Timeout: 60 seconds");
    console.log("\nNext steps:");
    console.log("1. Import HttpAdapterDemo.zip into SAP Integration Suite");
    console.log("2. Open in visual editor");
    console.log("3. Verify HTTPS Sender shows endpoint /api/products");
    console.log("4. Verify HTTP Receiver configuration");
    console.log("5. Configure actual target URL in HTTP Receiver");
    console.log("6. Deploy and test by sending POST to /api/products");
    console.log("=".repeat(60));

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Run the example
generateHttpAdapterDemo().catch(error => {
    console.error("❌ Error generating HTTP Adapter demo:", error);
    process.exit(1);
});
