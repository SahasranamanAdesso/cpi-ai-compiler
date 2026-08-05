import { IFlow } from "../src/model/IFlow";
import { XsltMapping } from "../src/model/XsltMapping";
import { XsltResource } from "../src/model/XsltResource";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * XSLT Mapping Example - Generate Integration Flow with XSLT Transformation
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (create source XML)
 *       ↓
 *   XSLT Mapping (transform Order → Invoice)
 *       ↓
 *   Content Modifier (log result)
 *       ↓
 *   HTTP Receiver
 *
 * This demonstrates:
 * - XsltMapping component with XSLT transformation
 * - XsltResource for packaging .xsl files
 * - Complete XML structure transformation
 *
 * SAP Evidence:
 * - BPMN: POC2.iflw lines 756-801
 * - Stylesheet: POC2 src/main/resources/mapping/XSLTMapping1.xsl
 * - Component: activityType="Mapping", subActivityType="XSLTMapping"
 * - Version: 1.2, cmdVariantUri version 1.2.0
 */
async function generateXsltMappingDemo() {
    console.log("🚀 Generating XSLT Mapping Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("XsltMappingDemo");

    // Create source payload (Order XML)
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
    <Currency>USD</Currency>
    <Items>
        <Item>
            <ProductID>PROD001</ProductID>
            <Quantity>5</Quantity>
            <Price>199.99</Price>
        </Item>
    </Items>
</Order>`
        }
    );
    flow.addComponent(sourcePayload);

    // Create XSLT stylesheet for Order → Invoice transformation
    const xsltStylesheet = new XsltResource(
        "OrderToInvoice.xsl",
        `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
\t<xsl:output method="xml" indent="yes"/>
\t
\t<xsl:template match="/">
\t\t<Invoice>
\t\t\t<InvoiceID>
\t\t\t\t<xsl:text>INV-</xsl:text>
\t\t\t\t<xsl:value-of select="Order/OrderID"/>
\t\t\t</InvoiceID>
\t\t\t<CustomerName>
\t\t\t\t<xsl:value-of select="Order/Customer"/>
\t\t\t</CustomerName>
\t\t\t<TotalAmount>
\t\t\t\t<xsl:value-of select="Order/Amount"/>
\t\t\t</TotalAmount>
\t\t\t<Currency>
\t\t\t\t<xsl:value-of select="Order/Currency"/>
\t\t\t</Currency>
\t\t\t<LineItems>
\t\t\t\t<xsl:for-each select="Order/Items/Item">
\t\t\t\t\t<LineItem>
\t\t\t\t\t\t<Product>
\t\t\t\t\t\t\t<xsl:value-of select="ProductID"/>
\t\t\t\t\t\t</Product>
\t\t\t\t\t\t<Qty>
\t\t\t\t\t\t\t<xsl:value-of select="Quantity"/>
\t\t\t\t\t\t</Qty>
\t\t\t\t\t\t<UnitPrice>
\t\t\t\t\t\t\t<xsl:value-of select="Price"/>
\t\t\t\t\t\t</UnitPrice>
\t\t\t\t\t</LineItem>
\t\t\t\t</xsl:for-each>
\t\t\t</LineItems>
\t\t</Invoice>
\t</xsl:template>
</xsl:stylesheet>`
    );
    flow.addResource(xsltStylesheet);

    console.log("✅ XSLT stylesheet created");
    console.log(`   - Stylesheet: ${xsltStylesheet.name}`);
    console.log(`   - Transformation: Order → Invoice\n`);

    // Create XSLT Mapping component
    const mapping = new XsltMapping(
        "Transform to Invoice",
        "OrderToInvoice.xsl",
        "Bytes"  // output format
    );
    flow.addComponent(mapping);
    flow.connect(sourcePayload, mapping);

    console.log("✅ Domain model created");
    console.log(`   - Mapping Component: ${mapping.name}`);
    console.log(`   - Stylesheet: OrderToInvoice.xsl`);
    console.log(`   - Output format: Bytes\n`);

    // Log transformed result
    const logResult = new Component(
        "CallActivity_Log",
        "Log Invoice",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${body}</cell><cell id='Name'>InvoicePayload</cell></row>"
        }
    );
    flow.addComponent(logResult);
    flow.connect(mapping, logResult);

    // 2. Map to BPMN IR
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'XsltMappingDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "XsltMappingDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP with stylesheet resource
    const outputZip = path.join(process.cwd(), 'XsltMappingDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "XsltMappingDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=".repeat(60));
    console.log("📦 XSLT MAPPING DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nPackage structure:");
    console.log("   ✓ src/main/resources/mapping/OrderToInvoice.xsl");
    console.log("\nXSLT transformation includes:");
    console.log("   ✓ Source: Order (OrderID, Customer, Amount, Items)");
    console.log("   ✓ Target: Invoice (InvoiceID, CustomerName, TotalAmount, LineItems)");
    console.log("   ✓ Field mappings:");
    console.log("     - OrderID → INV-{OrderID}");
    console.log("     - Customer → CustomerName");
    console.log("     - Amount → TotalAmount");
    console.log("     - Items → LineItems (with <xsl:for-each>)");
    console.log("\nNext steps:");
    console.log("1. Import XsltMappingDemo.zip into SAP Integration Suite");
    console.log("2. Open in visual editor");
    console.log("3. Click 'Transform to Invoice' component");
    console.log("4. Verify XSLT mapping configuration");
    console.log("5. Deploy and test transformation");
    console.log("6. Check output shows Invoice XML structure");
    console.log("=".repeat(60));

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Run the example
generateXsltMappingDemo().catch(error => {
    console.error("❌ Error generating XSLT Mapping demo:", error);
    process.exit(1);
});
