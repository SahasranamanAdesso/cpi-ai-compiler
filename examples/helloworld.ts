import { IFlow, Component, compileToZip } from "@cpi-ai/compiler";
import * as fs from 'fs';

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

    // 2. Compile to ZIP using the compiler package API
    const zipBuffer = await compileToZip(flow);

    // 3. Save to file
    const outputZip = 'HelloWorld.zip';
    fs.writeFileSync(outputZip, zipBuffer);

    console.log(`\n🎉 SUCCESS! Generated ${outputZip} (${zipBuffer.length} bytes)`);
    console.log(`\nNext steps:`);
    console.log(`1. Open SAP Integration Suite`);
    console.log(`2. Navigate to Design → Integrations`);
    console.log(`3. Click Import`);
    console.log(`4. Upload HelloWorld.zip`);
    console.log(`5. Deploy and test!`);
}

generateHelloWorld().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
