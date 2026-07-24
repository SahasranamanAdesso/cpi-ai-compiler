import { IFlow } from "../src/model/IFlow";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * HelloWorld Example - Generate first importable CPI Integration Flow
 *
 * Flow structure:
 *   HTTPS Sender → Content Modifier → HTTPS Receiver
 *
 * This generates HelloWorld.zip ready to import into SAP Integration Suite.
 */
async function generateHelloWorld() {
    console.log("🚀 Generating HelloWorld Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("HelloWorld");

    const contentModifier = new Component(
        "CallActivity_1",
        "Set Body",
        "Enricher",
        {
            // User properties (defaults come from Registry metadata)
            body: "Hello from SAP Integration Suite!"
        }
    );

    flow.addComponent(contentModifier);

    console.log("✅ Domain model created");

    // 2. Map to IR (BpmnDefinitions)
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);

    console.log("✅ Mapped to BPMN IR");

    // 3. Serialize to .iflw file
    // Note: Properties are now automatically injected by ComponentMapper from Registry metadata
    const tempDir = path.join(os.tmpdir(), 'HelloWorld');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "HelloWorld");

    console.log("✅ Serialized to .iflw");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'HelloWorld.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "HelloWorld", outputZip);

    console.log(`\n🎉 SUCCESS! Generated ${outputZip}`);
    console.log(`\nNext steps:`);
    console.log(`1. Open SAP Integration Suite`);
    console.log(`2. Navigate to Design → Integrations`);
    console.log(`3. Click Import`);
    console.log(`4. Upload HelloWorld.zip`);
    console.log(`5. Deploy and test!`);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateHelloWorld().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
