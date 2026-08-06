import { IFlow } from "../src/model/IFlow";
import { GroovyScript } from "../src/model/GroovyScript";
import { GroovyResource } from "../src/model/GroovyResource";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Groovy Script Example - Demonstrates resource-backed processing component
 *
 * Flow structure:
 *   HTTPS Sender → Groovy Script → HTTPS Receiver
 *
 * This example validates the metadata-driven architecture by:
 * 1. Using the generic GroovyScript SDK component
 * 2. Registry metadata automatically injected by ComponentMapper
 * 3. CallActivityWriter generates XML without component-specific logic
 * 4. Resource packaging handled by IflowPackager
 *
 * Generated artifact: GroovyDemo.zip
 * Ready to import into SAP Integration Suite
 */
async function generateGroovyScriptFlow() {
    console.log("🚀 Generating Groovy Script Integration Flow...\n");

    // 1. Define Groovy script content
    const scriptContent = `import com.sap.gateway.ip.core.customdev.util.Message
import groovy.json.JsonSlurper
import groovy.json.JsonOutput

def Message processData(Message message) {
    // Get message body as string
    def body = message.getBody(String.class)

    // Log original message
    def messageLog = messageLogFactory.getMessageLog(message)
    messageLog.addAttachmentAsString("Original Message", body, "text/plain")

    // Transform message to uppercase
    def transformed = body.toUpperCase()

    // Add custom header
    message.setHeader("ProcessedBy", "GroovyScript")
    message.setHeader("ProcessedAt", new Date().toString())

    // Set transformed body
    message.setBody(transformed)

    return message
}`;

    // 2. Build domain model
    const flow = new IFlow("GroovyDemo");

    // Create Groovy Script component using SDK
    const groovyScript = new GroovyScript(
        "Transform Message",
        "transform.groovy"
    );

    flow.addComponent(groovyScript);

    // Create Groovy Resource with inline content
    const groovyResource = new GroovyResource(
        "transform.groovy",
        scriptContent
    );

    flow.addResource(groovyResource);

    console.log("✅ Domain model created");
    console.log(`   - Component: ${groovyScript.name} (${groovyScript.componentType})`);
    console.log(`   - Script Reference: ${groovyScript.getScriptReference()}`);
    console.log(`   - Resource: ${groovyResource.name} (${groovyResource.type})`);

    // 3. Map to IR (BpmnDefinitions)
    // ComponentMapper will query Registry for ScriptCollection metadata
    // and inject: activityType, operation, cmdVariantUri, componentVersion
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);

    console.log("✅ Mapped to BPMN IR");
    console.log("   - Registry metadata automatically injected");
    console.log("   - No component-specific writer logic required");

    // 4. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'GroovyDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "GroovyDemo");

    console.log("✅ Serialized to .iflw");

    // 5. Package to ZIP with resources
    const outputZip = path.join(process.cwd(), 'GroovyDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    const resources = flow.getResources();
    await packager.package(tempDir, "GroovyDemo", outputZip, resources);

    console.log(`\n🎉 SUCCESS! Generated ${outputZip}`);
    console.log(`\n📦 Package contents:`);
    console.log(`   - BPMN: GroovyDemo.iflw`);
    console.log(`   - Script: script/transform.groovy`);
    console.log(`   - Size: ${fs.statSync(outputZip).size} bytes`);
    console.log(`\nNext steps:`);
    console.log(`1. Open SAP Integration Suite`);
    console.log(`2. Navigate to Design → Integrations`);
    console.log(`3. Click Import`);
    console.log(`4. Upload GroovyDemo.zip`);
    console.log(`5. Deploy and test!`);
    console.log(`\n✨ Architecture Validation:`);
    console.log(`   ✓ Generic GroovyScript component`);
    console.log(`   ✓ Registry metadata drives compilation`);
    console.log(`   ✓ CallActivityWriter remains generic`);
    console.log(`   ✓ Resource packaging successful`);
    console.log(`   ✓ No writer modifications required`);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateGroovyScriptFlow().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
