import { IFlow } from "../src/model/IFlow";
import { Splitter } from "../src/model/Splitter";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Splitter Example - Generate Integration Flow with General Splitter
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (create test XML)
 *       ↓
 *   Splitter (split by /Products/Product)
 *       ↓
 *   Content Modifier (process each product)
 *       ↓
 *   HTTP Receiver
 *
 * This demonstrates:
 * - Splitter component (BPMN callActivity with activityType="Splitter")
 * - XPath-based splitting for XML messages
 * - Parallel processing configuration
 * - Typical split-process-aggregate pattern
 *
 * SAP Evidence: POC.iflw lines 1082-1135
 */
async function generateSplitterDemo() {
    console.log("🚀 Generating Splitter Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("SplitterDemo");

    // Create source payload
    const sourcePayload = new Component(
        "CallActivity_Source",
        "Create Source Payload",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `<?xml version="1.0" encoding="UTF-8"?>
<Products>
    <Product>
        <ID>P001</ID>
        <Name>Laptop</Name>
        <Price>999.99</Price>
    </Product>
    <Product>
        <ID>P002</ID>
        <Name>Mouse</Name>
        <Price>29.99</Price>
    </Product>
    <Product>
        <ID>P003</ID>
        <Name>Keyboard</Name>
        <Price>79.99</Price>
    </Product>
    <Product>
        <ID>P004</ID>
        <Name>Monitor</Name>
        <Price>299.99</Price>
    </Product>
</Products>`
        }
    );
    flow.addComponent(sourcePayload);

    // Create Splitter component
    // Split by /Products/Product XPath
    const splitter = new Splitter(
        "Split Products",
        "/Products/Product",
        {
            ParallelProcessing: "true",  // Enable parallel processing
            SplitterThreads: "5",         // Use 5 parallel threads
            Streaming: "true",            // Enable streaming for large messages
            StopOnExecution: "true",      // Stop on exception
            timeOut: "300"                // 5 minute timeout
        }
    );
    flow.addComponent(splitter);
    flow.connect(sourcePayload, splitter);

    console.log("✅ Domain model created");
    console.log(`   - Splitter: ${splitter.name}`);
    console.log(`   - Split Expression: ${splitter.getSplitExpression()}`);
    console.log(`   - Expression Type: ${splitter.getExpressionType()}`);
    console.log(`   - Parallel Processing: ${splitter.isParallelProcessing()}`);
    console.log(`   - Threads: ${splitter.getSplitterThreads()}\n`);

    // Process each product
    const processProduct = new Component(
        "CallActivity_Process",
        "Process Product",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>xpath</cell><cell id='Value'>//ID</cell><cell id='Name'>ProductID</cell></row>"
        }
    );
    flow.addComponent(processProduct);
    flow.connect(splitter, processProduct);

    // 2. Map to BPMN IR
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'SplitterDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "SplitterDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'SplitterDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "SplitterDemo", outputZip);

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=" .repeat(60));
    console.log("📦 SPLITTER DEMO COMPLETE");
    console.log("=" .repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nGenerated BPMN includes:");
    console.log("   ✓ <bpmn2:callActivity activityType='Splitter'>");
    console.log("   ✓ splitExprValue: /Products/Product");
    console.log("   ✓ exprType: XPath");
    console.log("   ✓ ParallelProcessing: true");
    console.log("   ✓ SplitterThreads: 5");
    console.log("\nNext steps:");
    console.log("1. Import SplitterDemo.zip into SAP Integration Suite");
    console.log("2. Open in visual editor");
    console.log("3. Verify splitter configuration");
    console.log("4. Deploy and test");
    console.log("=" .repeat(60));

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Run the example
generateSplitterDemo().catch(error => {
    console.error("❌ Error generating Splitter demo:", error);
    process.exit(1);
});
