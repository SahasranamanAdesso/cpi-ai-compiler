import { IFlow } from "../src/model/IFlow";
import { ProcessCall } from "../src/model/ProcessCall";
import { LocalIntegrationProcess } from "../src/model/LocalIntegrationProcess";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Process Call + Local Integration Process Example
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (create input)
 *       ↓
 *   Process Call → Local Integration Process (reusable data lookup)
 *       ↓
 *   Content Modifier (log result)
 *       ↓
 *   HTTP Receiver
 *
 * This demonstrates:
 * - Local Integration Process (reusable subprocess)
 * - Process Call component (invokes subprocess)
 * - Modular integration pattern
 *
 * SAP Evidence:
 * - Local Integration Process: POC.iflw lines 530-546
 * - Process Call: POC.iflw lines 1058-1081
 *
 * NOTE: This generates SDK demonstration of the classes.
 * Full BPMN generation requires mapper enhancement for subprocess support.
 */
async function generateProcessCallDemo() {
    console.log("🚀 Generating Process Call Demo Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("ProcessCallDemo");

    // Create Local Integration Process (subprocess)
    const subprocess = new LocalIntegrationProcess(
        "DataLookupProcess",
        "From Calling Process" // transaction handling
    );

    // Add components to subprocess
    const lookupData = new Component(
        "CallActivity_SP1",
        "Lookup Product Data",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>Sample Product Data</cell><cell id='Name'>ProductInfo</cell></row>"
        }
    );
    subprocess.addComponent(lookupData);

    const enrichData = new Component(
        "CallActivity_SP2",
        "Enrich with Details",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>Additional Details</cell><cell id='Name'>EnrichedData</cell></row>"
        }
    );
    subprocess.addComponent(enrichData);
    subprocess.connect(lookupData, enrichData);

    // Add subprocess to flow
    flow.addSubProcess(subprocess);

    console.log("✅ Local Integration Process created");
    console.log(`   - Name: ${subprocess.name}`);
    console.log(`   - ID: ${subprocess.id}`);
    console.log(`   - Components: 2 (Lookup + Enrich)`);
    console.log(`   - Transaction: From Calling Process\n`);

    // Main process components
    const createInput = new Component(
        "CallActivity_1",
        "Create Input Data",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `{"productId": "PROD001", "requestType": "lookup"}`
        }
    );
    flow.addComponent(createInput);

    // Process Call to invoke subprocess
    const processCall = new ProcessCall(
        "Call Data Lookup",
        subprocess.id,
        false // non-looping
    );
    flow.addComponent(processCall);
    flow.connect(createInput, processCall);

    console.log("✅ Process Call created");
    console.log(`   - Name: ${processCall.name}`);
    console.log(`   - Target Process: ${subprocess.id}`);
    console.log(`   - Looping: ${processCall.isLooping()}\n`);

    // Log result after subprocess
    const logResult = new Component(
        "CallActivity_2",
        "Log Result",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${body}</cell><cell id='Name'>ProcessResult</cell></row>"
        }
    );
    flow.addComponent(logResult);
    flow.connect(processCall, logResult);

    console.log("✅ Domain model created");
    console.log(`   - Main process: 3 components`);
    console.log(`   - Subprocess: 2 components`);
    console.log(`   - Process Call links main → subprocess\n`);

    // 2. Map to BPMN IR
    console.log("⚠️  Note: Full subprocess BPMN generation requires mapper enhancement");
    console.log("   This demo shows SDK usage. Mapper integration pending.\n");

    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR (basic structure)\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'ProcessCallDemo');

    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "ProcessCallDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'ProcessCallDemo.zip');

    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "ProcessCallDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=".repeat(60));
    console.log("📦 PROCESS CALL DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nSDK Classes Demonstrated:");
    console.log("\nLocalIntegrationProcess:");
    console.log("   ✓ Created reusable subprocess");
    console.log("   ✓ Added internal components (Lookup + Enrich)");
    console.log("   ✓ Set transaction handling mode");
    console.log("   ✓ Connected internal flow");
    console.log("\nProcessCall:");
    console.log("   ✓ Links main process to subprocess");
    console.log("   ✓ References subprocess by ID");
    console.log("   ✓ Supports looping/non-looping modes");
    console.log("\nFlow Structure:");
    console.log("   Main: Create Input → Process Call → Log Result");
    console.log("   Subprocess: Lookup Data → Enrich Data");
    console.log("\n⚠️  Important Notes:");
    console.log("   - SDK classes are complete and functional");
    console.log("   - Full BPMN generation requires mapper enhancement");
    console.log("   - Estimated mapper work: 3-4 days");
    console.log("   - ZIP demonstrates SDK API usage");
    console.log("\nNext steps:");
    console.log("1. Import ProcessCallDemo.zip into SAP Integration Suite");
    console.log("2. Review generated structure");
    console.log("3. Note: Full subprocess nesting requires mapper enhancement");
    console.log("=".repeat(60));

    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateProcessCallDemo().catch(error => {
    console.error("❌ Error generating Process Call demo:", error);
    process.exit(1);
});
