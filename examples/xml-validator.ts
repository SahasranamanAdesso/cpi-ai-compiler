import { IFlow } from "../src/model/IFlow";
import { XmlValidator } from "../src/model/XmlValidator";
import { XsdResource } from "../src/model/XsdResource";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * XML Validator Example - Generate Integration Flow with XML Validation
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (create sample XML)
 *       ↓
 *   XML Validator (validate against schema)
 *       ↓
 *   Content Modifier (log success)
 *       ↓
 *   HTTP Receiver
 *
 * This demonstrates:
 * - XmlValidator component with XSD schema validation
 * - XsdResource for packaging schema files
 * - Validation with exception on failure
 *
 * SAP Evidence:
 * - BPMN: POC.iflw lines 756-789
 * - Component: activityType="XmlValidator"
 * - Version: 2.2, cmdVariantUri version 2.2.3
 */
async function generateXmlValidatorDemo() {
    console.log("🚀 Generating XML Validator Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("XmlValidatorDemo");

    // Create sample XML payload (Order)
    const sourcePayload = new Component(
        "CallActivity_Source",
        "Create Order XML",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `<?xml version="1.0" encoding="UTF-8"?>
<Order>
    <OrderID>ORD12345</OrderID>
    <Customer>ACME Corp</Customer>
    <Amount>999.99</Amount>
    <Date>2026-08-05</Date>
</Order>`
        }
    );
    flow.addComponent(sourcePayload);

    // Create XSD schema for Order
    const orderSchema = new XsdResource(
        "OrderSchema.xsd",
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
\t<xs:element name="Order">
\t\t<xs:complexType>
\t\t\t<xs:sequence>
\t\t\t\t<xs:element name="OrderID" type="xs:string" minOccurs="1"/>
\t\t\t\t<xs:element name="Customer" type="xs:string" minOccurs="1"/>
\t\t\t\t<xs:element name="Amount" type="xs:decimal" minOccurs="1"/>
\t\t\t\t<xs:element name="Date" type="xs:date" minOccurs="0"/>
\t\t\t</xs:sequence>
\t\t</xs:complexType>
\t</xs:element>
</xs:schema>`
    );
    flow.addResource(orderSchema);

    console.log("✅ XSD schema created");
    console.log(`   - Schema: ${orderSchema.name}`);
    console.log(`   - Required: OrderID, Customer, Amount`);
    console.log(`   - Optional: Date\n`);

    // Create XML Validator component
    const validator = new XmlValidator(
        "Validate Order",
        "/xsd/OrderSchema.xsd",
        false  // throw exception on validation failure
    );
    flow.addComponent(validator);
    flow.connect(sourcePayload, validator);

    console.log("✅ Domain model created");
    console.log(`   - Validator: ${validator.name}`);
    console.log(`   - Schema: /xsd/OrderSchema.xsd`);
    console.log(`   - Exception on failure: true\n`);

    // Log validation success
    const logSuccess = new Component(
        "CallActivity_Log",
        "Log Validation Success",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>true</cell><cell id='Name'>ValidationPassed</cell></row>"
        }
    );
    flow.addComponent(logSuccess);
    flow.connect(validator, logSuccess);

    // 2. Map to BPMN IR
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'XmlValidatorDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "XmlValidatorDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP with schema resource
    const outputZip = path.join(process.cwd(), 'XmlValidatorDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "XmlValidatorDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=".repeat(60));
    console.log("📦 XML VALIDATOR DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nPackage structure:");
    console.log("   ✓ src/main/resources/xsd/OrderSchema.xsd");
    console.log("\nXML Validator configuration:");
    console.log("   ✓ Schema source: iflowOption (from resources)");
    console.log("   ✓ Schema path: /xsd/OrderSchema.xsd");
    console.log("   ✓ Exception on failure: true");
    console.log("\nValidation rules:");
    console.log("   ✓ OrderID: required (string)");
    console.log("   ✓ Customer: required (string)");
    console.log("   ✓ Amount: required (decimal)");
    console.log("   ✓ Date: optional (date)");
    console.log("\nNext steps:");
    console.log("1. Import XmlValidatorDemo.zip into SAP Integration Suite");
    console.log("2. Open in visual editor");
    console.log("3. Verify 'Validate Order' component shows correct schema");
    console.log("4. Deploy and test with valid/invalid XML");
    console.log("5. Check that invalid XML throws validation exception");
    console.log("=".repeat(60));

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Run the example
generateXmlValidatorDemo().catch(error => {
    console.error("❌ Error generating XML Validator demo:", error);
    process.exit(1);
});
