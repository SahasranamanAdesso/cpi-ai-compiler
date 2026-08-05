import { IFlow } from "../src/model/IFlow";
import { MessageMapping } from "../src/model/MessageMapping";
import { MappingResource } from "../src/model/MappingResource";
import { XsdResource } from "../src/model/XsdResource";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Message Mapping Example - Generate Integration Flow with Message Mapping
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (create source XML)
 *       ↓
 *   Message Mapping (transform Order → Invoice)
 *       ↓
 *   Content Modifier (log target)
 *       ↓
 *   HTTP Receiver
 *
 * This demonstrates:
 * - MessageMapping component with proper SAP .mmap format
 * - XSD schema resources (source and target)
 * - Complete resource packaging
 *
 * SAP Evidence:
 * - BPMN: POC.iflw lines 1136-1181
 * - .mmap format: POC1 MM_S4HANA_to_3rdParty.mmap (reverse engineered)
 */
async function generateMessageMappingDemo() {
    console.log("🚀 Generating Message Mapping Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("MessageMappingDemo");

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
    <Customer>CUST001</Customer>
    <Amount>999.99</Amount>
</Order>`
        }
    );
    flow.addComponent(sourcePayload);

    // Create Source XSD schema
    const sourceXsd = new XsdResource(
        "OrderSource.xsd",
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
\t<xs:element name="Order">
\t\t<xs:complexType>
\t\t\t<xs:sequence>
\t\t\t\t<xs:element name="OrderID" type="xs:string" minOccurs="0"/>
\t\t\t\t<xs:element name="Customer" type="xs:string" minOccurs="0"/>
\t\t\t\t<xs:element name="Amount" type="xs:string" minOccurs="0"/>
\t\t\t</xs:sequence>
\t\t</xs:complexType>
\t</xs:element>
</xs:schema>`
    );
    flow.addResource(sourceXsd);

    // Create Target XSD schema
    const targetXsd = new XsdResource(
        "InvoiceTarget.xsd",
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
\t<xs:element name="Invoice">
\t\t<xs:complexType>
\t\t\t<xs:sequence>
\t\t\t\t<xs:element name="InvoiceID" type="xs:string" minOccurs="0"/>
\t\t\t\t<xs:element name="CustomerID" type="xs:string" minOccurs="0"/>
\t\t\t\t<xs:element name="TotalAmount" type="xs:string" minOccurs="0"/>
\t\t\t</xs:sequence>
\t\t</xs:complexType>
\t</xs:element>
</xs:schema>`
    );
    flow.addResource(targetXsd);

    console.log("✅ XSD schemas created");
    console.log(`   - Source: ${sourceXsd.name}`);
    console.log(`   - Target: ${targetXsd.name}\n`);

    // Create .mmap file with real SAP format (reverse engineered from POC1)
    const mappingContent = `<xiObj xmlns="urn:sap-com:xi"><idInfo xmlns="" VID="01"><vc caption="LOCAL" sp="-1" swcGuid="00000000000000000000000000000000" vcType="S"><clCxt consider="A"/></vc><key typeID="XI_TRAFO" version=""/><version>1.0</version></idInfo><documentation xmlns=""><description/></documentation><generic xmlns=""><admInf><modifBy/><modifAt></modifAt><modifAtLong>1784705673708</modifAtLong><owner/></admInf><lnks><lnkRole kpos="1" role="TARGET_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>InvoiceTarget.xsd</elem><elem>src/main/resources/xsd</elem><elem>Invoice</elem></key></lnk></lnkRole><lnkRole kpos="1" role="SOURCE_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>OrderSource.xsd</elem><elem>src/main/resources/xsd</elem><elem>Order</elem></key></lnk></lnkRole></lnks><textInfo loadedL="EN"><textObj id="7a2aa18a13cf4a0789852c1ee83281d7" masterL="EN" type="0"><texts lang="EN"><text label=""/></texts></textObj></textInfo></generic><AdditionalProperties xmlns=""><Property Applicable="BOTH"><PropertyName>externalNameSpace</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>choiceOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>groupsOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>topLevelChoiceOccurrenceApplied</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property></AdditionalProperties><content xmlns=""><tr:XiTrafo xmlns:tr="urn:sap-com:xi:mapping:xitrafo"><tr:MetaData><mappingtool version="XI7.1"><project version="XI7.1"><libstorage><entry name="usernamespace"><functionstorage version="XI7.1"><key><key typeID=""><elem/><elem/></key></key><classname/><package/><imports/><globals><javaText/></globals><init><functionmodel><signature cacheType="0"/><name/><key/><tab/><title/><uiTitle/><implementation type="udf"><javaText/></implementation></functionmodel></init><cleanup><javaText/></cleanup><usedjars/></functionstorage></entry></libstorage><transformation><brick gid="0" path="/Invoice" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick><brick gid="0" path="/Invoice/InvoiceID" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order/OrderID" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick><brick gid="0" path="/Invoice/CustomerID" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order/Customer" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick><brick gid="0" path="/Invoice/TotalAmount" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order/Amount" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick></transformation><testData><instances/></testData><ViewState></ViewState><pcont/></project></mappingtool></tr:MetaData><tr:ByteCodeJar/><tr:SourceStructure/><tr:TargetStructure/><tr:Multiplicity>1:1</tr:Multiplicity><tr:SourceParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:SourceParameters><tr:TargetParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:TargetParameters></tr:XiTrafo></content></xiObj>`;

    // Create mapping resource
    const mappingResource = new MappingResource(
        "Order_to_Invoice.mmap",
        mappingContent
    );
    flow.addResource(mappingResource);

    console.log("✅ Mapping resource created (SAP format)");
    console.log(`   - Format: SAP XI Transformation`);
    console.log(`   - Mappings: OrderID→InvoiceID, Customer→CustomerID, Amount→TotalAmount\n`);

    // Create Message Mapping component
    const mapping = new MessageMapping(
        "Transform to Invoice",
        "Order_to_Invoice.mmap"
    );
    flow.addComponent(mapping);
    flow.connect(sourcePayload, mapping);

    console.log("✅ Domain model created");
    console.log(`   - Mapping Component: ${mapping.name}`);
    console.log(`   - Resources: 3 (1 .mmap + 2 .xsd)\n`);

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
    const tempDir = path.join(os.tmpdir(), 'MessageMappingDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "MessageMappingDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP with all resources
    const outputZip = path.join(process.cwd(), 'MessageMappingDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "MessageMappingDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=" .repeat(60));
    console.log("📦 MESSAGE MAPPING DEMO COMPLETE");
    console.log("=" .repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nPackage structure:");
    console.log("   ✓ src/main/resources/xsd/OrderSource.xsd");
    console.log("   ✓ src/main/resources/xsd/InvoiceTarget.xsd");
    console.log("   ✓ src/main/resources/mapping/Order_to_Invoice.mmap");
    console.log("\nGenerated .mmap includes:");
    console.log("   ✓ SAP XI Transformation format (reverse engineered from POC1)");
    console.log("   ✓ Source: OrderSource.xsd → Order element");
    console.log("   ✓ Target: InvoiceTarget.xsd → Invoice element");
    console.log("   ✓ Field mappings:");
    console.log("     - OrderID → InvoiceID");
    console.log("     - Customer → CustomerID");
    console.log("     - Amount → TotalAmount");
    console.log("\nNext steps:");
    console.log("1. Import MessageMappingDemo.zip into SAP Integration Suite");
    console.log("2. Open in visual editor");
    console.log("3. Click 'Transform to Invoice' component");
    console.log("4. Mapping should open in graphical editor WITHOUT errors");
    console.log("5. Verify field mappings are visible");
    console.log("6. Deploy and test");
    console.log("=" .repeat(60));

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

// Run the example
generateMessageMappingDemo().catch(error => {
    console.error("❌ Error generating Message Mapping demo:", error);
    process.exit(1);
});
