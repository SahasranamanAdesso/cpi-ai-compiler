/**
 * DEBUG VERSION - Order Processing Demo
 *
 * This version adds debug output to verify the model state at each step.
 */

import {
    compileToZip,
    IFlow,
    Component,
    Router,
    XmlValidator,
    XsdResource,
    XsltMapping,
    XsltResource,
    GroovyScript,
    GroovyResource,
    HttpAdapter,
    ODataAdapter,
    ExceptionSubprocess
} from '@cpi-ai/compiler';

import * as fs from 'fs';
import * as path from 'path';

async function debugOrderProcessing() {
    console.log("🔍 DEBUG: Order Processing - Model State Verification\n");
    console.log("=".repeat(70));

    // 1. Create IFlow
    const flow = new IFlow("OrderProcessing");
    console.log(`\n1. Created IFlow`);
    console.log(`   Components: ${flow.getComponents().length}`);
    console.log(`   Connections: ${flow.getConnections().length}`);
    console.log(`   Resources: ${flow.getResources().length}`);

    // 2. Set Sender
    const sender = HttpAdapter.sender({ address: "/orders" });
    flow.setSender(sender);
    console.log(`\n2. Added HTTPS Sender`);
    console.log(`   Sender set: ${flow.getSender() ? 'YES' : 'NO'}`);

    // 3. Add XSD Resource
    const orderSchemaXsd = new XsdResource("OrderSchema.xsd", `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"></xs:schema>`);
    flow.addResource(orderSchemaXsd);
    console.log(`\n3. Added XSD Resource`);
    console.log(`   Resources: ${flow.getResources().length}`);

    // 4. Add XML Validator
    const xmlValidator = new XmlValidator("ValidateOrder", "OrderSchema.xsd");
    flow.addComponent(xmlValidator);
    console.log(`\n4. Added XML Validator`);
    console.log(`   Components: ${flow.getComponents().length}`);
    console.log(`   Component ID: ${xmlValidator.id}`);
    console.log(`   Component Type: ${xmlValidator.componentType}`);

    // 5. Add Content Modifier
    const addMetadata = new Component("CallActivity_AddMetadata", "Add Metadata", "Enricher");
    flow.addComponent(addMetadata);
    flow.connect(xmlValidator, addMetadata);
    console.log(`\n5. Added Content Modifier`);
    console.log(`   Components: ${flow.getComponents().length}`);
    console.log(`   Connections: ${flow.getConnections().length}`);

    // 6. Add Router
    const router = new Router("Route by Type");
    router.when("${xpath.//OrderType} = 'STANDARD'");
    flow.addComponent(router);
    flow.connect(addMetadata, router);
    console.log(`\n6. Added Router`);
    console.log(`   Components: ${flow.getComponents().length}`);
    console.log(`   Connections: ${flow.getConnections().length}`);

    // 7. Add XSLT Resource
    const xsltResource = new XsltResource("Transform.xsl", `<?xml version="1.0"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"></xsl:stylesheet>`);
    flow.addResource(xsltResource);
    console.log(`\n7. Added XSLT Resource`);
    console.log(`   Resources: ${flow.getResources().length}`);

    // 8. Add XSLT Mapping
    const xsltMapping = new XsltMapping("Transform", "Transform.xsl");
    flow.addComponent(xsltMapping);
    flow.connect(router, xsltMapping);
    console.log(`\n8. Added XSLT Mapping`);
    console.log(`   Components: ${flow.getComponents().length}`);
    console.log(`   Connections: ${flow.getConnections().length}`);

    // 9. Set Receiver
    const odataReceiver = ODataAdapter.receiver({
        name: "Create Order",
        address: "{{S4HANA_URL}}",
        resourcePath: "Orders",
        operation: "Create"
    });
    flow.setReceiver(odataReceiver);
    console.log(`\n9. Added OData Receiver`);
    console.log(`   Receiver set: ${flow.getReceiver() ? 'YES' : 'NO'}`);

    // 10. Final State Before Compilation
    console.log("\n" + "=".repeat(70));
    console.log("FINAL MODEL STATE BEFORE COMPILATION:");
    console.log("=".repeat(70));
    console.log(`Total Components: ${flow.getComponents().length}`);
    console.log(`Total Connections: ${flow.getConnections().length}`);
    console.log(`Total Resources: ${flow.getResources().length}`);
    console.log(`Sender: ${flow.getSender() ? 'SET' : 'NOT SET'}`);
    console.log(`Receiver: ${flow.getReceiver() ? 'SET' : 'NOT SET'}`);

    console.log("\nComponent List:");
    flow.getComponents().forEach((comp, index) => {
        console.log(`  ${index + 1}. ${comp.name} (ID: ${comp.id}, Type: ${comp.componentType})`);
    });

    console.log("\nConnection List:");
    flow.getConnections().forEach((conn, index) => {
        console.log(`  ${index + 1}. ${conn.from.name} → ${conn.to.name}`);
    });

    console.log("\nResource List:");
    flow.getResources().forEach((res, index) => {
        console.log(`  ${index + 1}. ${res.name} (Type: ${res.type})`);
    });

    // 11. Compile
    console.log("\n" + "=".repeat(70));
    console.log("COMPILING TO ZIP...");
    console.log("=".repeat(70));

    const zipBuffer = await compileToZip(flow);

    // 12. Save
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'OrderProcessing_DEBUG.zip');
    fs.writeFileSync(outputPath, zipBuffer);

    console.log(`\n✅ ZIP Generated: ${outputPath}`);
    console.log(`   Size: ${(zipBuffer.length / 1024).toFixed(2)} KB`);

    console.log("\n" + "=".repeat(70));
    console.log("VERIFICATION: Check if components made it to the ZIP");
    console.log("=".repeat(70));
    console.log(`Expected Components in BPMN: ${flow.getComponents().length}`);
    console.log("Run this to verify:");
    console.log(`  Extract and count <bpmn2:callActivity> elements in the .iflw file`);
}

debugOrderProcessing().catch(error => {
    console.error("❌ Error:", error);
    console.error(error.stack);
    process.exit(1);
});
