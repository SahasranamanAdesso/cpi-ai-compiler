import { IFlow } from "../src/model/IFlow";
import { Splitter } from "../src/model/Splitter";
import { Gather } from "../src/model/Gather";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Gather Example - Generate Integration Flow with Split-Process-Gather Pattern
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
 *   Gather (aggregate results)
 *       ↓
 *   Content Modifier (log aggregated result)
 *       ↓
 *   HTTP Receiver
 *
 * This demonstrates:
 * - Splitter component (BPMN callActivity with activityType="Splitter")
 * - Gather component (BPMN callActivity with activityType="Gather")
 * - Complete split-process-aggregate pattern
 * - Aggregation algorithm configuration
 *
 * SAP Evidence:
 * - Splitter: POC.iflw lines 1082-1135
 * - Gather: POC.iflw lines 1018-1055
 */
async function generateGatherDemo() {
    console.log("🚀 Generating Split-Process-Gather Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("GatherDemo");

    // Create source payload with multiple products
    const sourcePayload = new Component(
        "CallActivity_Source",
        "Create Products XML",
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
</Products>`
        }
    );
    flow.addComponent(sourcePayload);

    // Create Splitter - split by /Products/Product
    const splitter = new Splitter(
        "Split Products",
        "/Products/Product",
        {
            ParallelProcessing: "false",  // Sequential for predictable order
            Streaming: "true"
        }
    );
    flow.addComponent(splitter);
    flow.connect(sourcePayload, splitter);

    console.log("✅ Domain model created");
    console.log(`   - Splitter: ${splitter.name}`);
    console.log(`   - Split Expression: ${splitter.getSplitExpression()}`);

    // Process each product (enrich with property)
    const processProduct = new Component(
        "CallActivity_Process",
        "Process Each Product",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>xpath</cell><cell id='Value'>//ID</cell><cell id='Name'>ProductID</cell></row>"
        }
    );
    flow.addComponent(processProduct);
    flow.connect(splitter, processProduct);

    // Create Gather - aggregate split messages back together
    const gather = new Gather(
        "Gather Products",
        "sap-identical-multi-mapping",
        {
            messageType: "SameXMLFormat",
            targetXPath: "",
            sourceXPath: ""
        }
    );
    flow.addComponent(gather);
    flow.connect(processProduct, gather);

    console.log(`   - Gather: ${gather.name}`);
    console.log(`   - Aggregation Algorithm: ${gather.getAggregationAlgorithm()}`);
    console.log(`   - Message Type: ${gather.getMessageType()}\n`);

    // Log aggregated result
    const logResult = new Component(
        "CallActivity_Log",
        "Log Aggregated Result",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${body}</cell><cell id='Name'>AggregatedPayload</cell></row>"
        }
    );
    flow.addComponent(logResult);
    flow.connect(gather, logResult);

    // 2. Map to BPMN IR
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'GatherDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "GatherDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'GatherDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "GatherDemo", outputZip);

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=" .repeat(60));
    console.log("📦 SPLIT-PROCESS-GATHER DEMO COMPLETE");
    console.log("=" .repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nGenerated BPMN includes:");
    console.log("   ✓ <bpmn2:callActivity activityType='Splitter'>");
    console.log("     - splitExprValue: /Products/Product");
    console.log("     - exprType: XPath");
    console.log("   ✓ <bpmn2:callActivity activityType='Gather'>");
    console.log("     - aggregationAlgorithm: sap-identical-multi-mapping");
    console.log("     - messageType: SameXMLFormat");
    console.log("\nNext steps:");
    console.log("1. Import GatherDemo.zip into SAP Integration Suite");
    console.log("2. Open in visual editor");
    console.log("3. Verify split-process-gather pattern");
    console.log("4. Deploy and test with sample payload");
    console.log("=" .repeat(60));

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Run the example
generateGatherDemo().catch(error => {
    console.error("❌ Error generating Gather demo:", error);
    process.exit(1);
});
