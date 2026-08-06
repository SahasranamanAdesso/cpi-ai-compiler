/**
 * Minimal End-to-End SAP Integration Suite Demo
 *
 * Scenario: Order Processing Integration
 * - HTTP Sender: Receive order XML
 * - Content Modifier: Add routing header
 * - Router: Route based on order type
 * - XML Validator: Validate against XSD schema
 * - XSLT Mapping: Transform to OData format
 * - OData Receiver: Create order in SAP
 *
 * All components use VERIFIED metadata from SAP exports
 * Resources (XSD, XSLT) are packaged with the iFlow
 *
 * Components NOT included (require mapper enhancements):
 * - Exception Subprocess (SDK class exists, mapper support pending)
 */

import { IFlow } from "../src/model/IFlow";
import { Component } from "../src/model/Component";
import { HttpAdapter } from "../src/model/HttpAdapter";
import { ODataAdapter } from "../src/model/ODataAdapter";
import { XsdResource } from "../src/model/XsdResource";
import { XsltResource } from "../src/model/XsltResource";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

async function generateMinimalDemo() {
    console.log("🚀 Generating Minimal End-to-End Integration Flow...\n");

    // Create integration flow
    const flow = new IFlow("MinimalDemo");

    // --- ADAPTERS (using placeholders) ---

    // HTTP Sender - receive order XML
    // Note: Placeholders are injected in serializer for configurable properties
    const httpSender = HttpAdapter.sender({
        address: "/api/orders",
        allowedMethods: ["POST"]
    });

    // OData Receiver - create order in SAP
    const odataReceiver = ODataAdapter.receiver({
        name: "OData",
        resourcePath: "OrderCollection",
        operation: "Create",
        version: "V2"
    });

    flow.setSender(httpSender);
    flow.setReceiver(odataReceiver);

    // --- PROCESSING COMPONENTS ---

    // 1. Content Modifier - Add routing header
    const contentModifier = new Component(
        "ContentMod1",
        "Set Routing Header",
        "Enricher",
        {
            headerTable: `<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>/Order/@Type</cell><cell id='Default'></cell><cell id='Name'>OrderType</cell><cell id='Datatype'>String</cell></row>`
        }
    );

    // 2. Router - Route based on order type
    // Note: Router needs at least 2 routes (1 conditional + 1 default)
    const router = new Component(
        "Router1",
        "Route by Type",
        "Router"
    );

    // Create an end component for default route
    const endDefault = new Component(
        "EndDefault",
        "End Default Route",
        "Enricher",
        {
            body: "Order skipped - did not match routing criteria"
        }
    );

    // 3. XML Validator - Validate order structure
    const xmlValidator = new Component(
        "XmlValidator1",
        "Validate Order",
        "XmlValidator",
        {
            xmlSchemaSource: "iflowOption",
            xsd: "/xsd/Order.xsd",
            preventException: "false"
        }
    );

    // 4. XSLT Mapping - Transform to OData format
    const xsltMapping = new Component(
        "XsltMapping1",
        "Transform to OData",
        "XSLTMapping",
        {
            mappingname: "OrderToOData",
            mappinguri: "dir://mapping/xslt/src/main/resources/mapping/OrderToOData.xsl",
            mappingpath: "src/main/resources/mapping/",
            mappingSource: "mappingSrcIflow",
            mappingoutputformat: "Bytes"
        }
    );

    // --- RESOURCES ---

    // XSD Schema for validation
    const orderSchema = new XsdResource(
        "Order.xsd",
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" elementFormDefault="qualified">
    <xs:element name="Order">
        <xs:complexType>
            <xs:sequence>
                <xs:element name="OrderID" type="xs:string"/>
                <xs:element name="Customer" type="xs:string"/>
                <xs:element name="Amount" type="xs:decimal"/>
            </xs:sequence>
            <xs:attribute name="Type" type="xs:string" use="required"/>
        </xs:complexType>
    </xs:element>
</xs:schema>`
    );

    // XSLT transformation
    const orderXslt = new XsltResource(
        "OrderToOData.xsl",
        `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="/Order">
        <entry xmlns="http://www.w3.org/2005/Atom">
            <content type="application/xml">
                <m:properties xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata"
                             xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices">
                    <d:OrderID><xsl:value-of select="OrderID"/></d:OrderID>
                    <d:Customer><xsl:value-of select="Customer"/></d:Customer>
                    <d:Amount><xsl:value-of select="Amount"/></d:Amount>
                </m:properties>
            </content>
        </entry>
    </xsl:template>
</xsl:stylesheet>`
    );

    flow.addResource(orderSchema);
    flow.addResource(orderXslt);

    // --- ADD ALL COMPONENTS TO FLOW ---

    flow.addComponent(contentModifier);
    flow.addComponent(router);
    flow.addComponent(xmlValidator);
    flow.addComponent(xsltMapping);
    flow.addComponent(endDefault);

    // --- SEQUENCE FLOW (Linear processing) ---

    // Content Modifier → Router
    flow.connect(contentModifier, router);

    // Router → XML Validator (Route 1: conditional)
    flow.connect(router, xmlValidator);

    // Router → End Default (Route 2: default)
    flow.connect(router, endDefault);

    // XML Validator → XSLT Mapping
    flow.connect(xmlValidator, xsltMapping);

    console.log("✅ Domain model created");

    // --- COMPILE TO BPMN ---

    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);

    console.log("✅ Mapped to BPMN IR");

    // --- SERIALIZE TO .iflw ---

    const tempDir = path.join(os.tmpdir(), 'MinimalDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "MinimalDemo");

    console.log("✅ Serialized to .iflw");

    // --- PACKAGE TO ZIP ---

    const outputZip = path.join(process.cwd(), 'MinimalDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    const resources = flow.getResources();
    await packager.package(tempDir, "MinimalDemo", outputZip, resources);

    console.log(`\n🎉 SUCCESS! Generated ${outputZip}`);
    console.log(`\n📦 Package size: ${fs.statSync(outputZip).size} bytes`);
    console.log(`\n✅ Verified Components (all metadata from SAP exports):`);
    console.log(`  • HTTP Sender (HTTPS adapter)`);
    console.log(`  • Content Modifier (Enricher v1.6)`);
    console.log(`  • Router (ExclusiveGateway v1.1)`);
    console.log(`  • XML Validator (v2.2)`);
    console.log(`  • XSLT Mapping (XSLTMapping v1.2)`);
    console.log(`  • OData Receiver (HCIOData V2)`);
    console.log(`\n📁 Resources:`);
    console.log(`  • Order.xsd (in xsd/ directory)`);
    console.log(`  • OrderToOData.xsl (in mapping/ directory)`);
    console.log(`\n🚀 Next steps:`);
    console.log(`1. Import MinimalDemo.zip into SAP Integration Suite`);
    console.log(`2. Open in Designer - all components should load successfully`);
    console.log(`3. Configure adapter placeholders (addresses, credentials)`);
    console.log(`4. Deploy and test`);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateMinimalDemo().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
