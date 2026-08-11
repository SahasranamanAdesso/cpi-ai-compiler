/**
 * Generate PROPER MappingResourceTest with full SAP .mmap format
 * Based on working MessageMappingDemo pattern
 */

import { IFlow } from './packages/compiler/src/model/IFlow';
import { MessageMapping } from './packages/compiler/src/model/MessageMapping';
import { MappingResource } from './packages/compiler/src/model/MappingResource';
import { XsdResource } from './packages/compiler/src/model/XsdResource';
import { HttpAdapter } from './packages/compiler/src/model/HttpAdapter';
import { compileToZip } from './packages/compiler/src/api/compile';
import * as fs from 'fs';

async function generateProperMappingResourceTest() {
    console.log('\n=== GENERATING PROPER MappingResourceTest.zip ===\n');

    // Create flow
    const flow = new IFlow("MappingResourceTest");

    // Set sender/receiver
    const sender = HttpAdapter.sender({ address: '/test' });
    const receiver = HttpAdapter.receiver({ url: 'https://example.com', method: 'POST' });
    flow.setSender(sender);
    flow.setReceiver(receiver);

    console.log('1. Creating XSD schemas...');

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

    console.log('   ✓ OrderSource.xsd created');
    console.log('   ✓ InvoiceTarget.xsd created\n');

    console.log('2. Creating .mmap file with FULL SAP format...');

    // Create .mmap file with REAL SAP format (same as MessageMappingDemo)
    const mappingContent = `<xiObj xmlns="urn:sap-com:xi"><idInfo xmlns="" VID="01"><vc caption="LOCAL" sp="-1" swcGuid="00000000000000000000000000000000" vcType="S"><clCxt consider="A"/></vc><key typeID="XI_TRAFO" version=""/><version>1.0</version></idInfo><documentation xmlns=""><description/></documentation><generic xmlns=""><admInf><modifBy/><modifAt></modifAt><modifAtLong>1784705673708</modifAtLong><owner/></admInf><lnks><lnkRole kpos="1" role="TARGET_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>InvoiceTarget.xsd</elem><elem>src/main/resources/xsd</elem><elem>Invoice</elem></key></lnk></lnkRole><lnkRole kpos="1" role="SOURCE_IFR_MESS"><lnk rMode="R"><key typeID="xsd" version="1.1"><elem>OrderSource.xsd</elem><elem>src/main/resources/xsd</elem><elem>Order</elem></key></lnk></lnkRole></lnks><textInfo loadedL="EN"><textObj id="7a2aa18a13cf4a0789852c1ee83281d7" masterL="EN" type="0"><texts lang="EN"><text label=""/></texts></textObj></textInfo></generic><AdditionalProperties xmlns=""><Property Applicable="BOTH"><PropertyName>externalNameSpace</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>choiceOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>groupsOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property><Property Applicable="BOTH"><PropertyName>topLevelChoiceOccurrence</PropertyName><PropertyValue>RESOLVED</PropertyValue></Property></AdditionalProperties><content xmlns=""><tr:XiTrafo xmlns:tr="urn:sap-com:xi:mapping:xitrafo"><tr:MetaData><mappingtool version="XI7.1"><project version="XI7.1"><libstorage><entry name="usernamespace"><functionstorage version="XI7.1"><key><key typeID=""><elem/><elem/></key></key><classname/><package/><imports/><globals><javaText/></globals><init><functionmodel><signature cacheType="0"/><name/><key/><tab/><title/><uiTitle/><implementation type="udf"><javaText/></implementation></functionmodel></init><cleanup><javaText/></cleanup><usedjars/></functionstorage></entry></libstorage><transformation><brick gid="0" path="/Invoice" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick><brick gid="0" path="/Invoice/InvoiceID" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order/OrderID" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick><brick gid="0" path="/Invoice/CustomerID" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order/Customer" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick><brick gid="0" path="/Invoice/TotalAmount" type="Dst"><viewData x="200" y="40"/><arg><brick gid="0" path="/Order/Amount" type="Src"><viewData x="50" y="40"/></brick></arg><group/></brick></transformation><testData><instances/></testData><ViewState></ViewState><pcont/></project></mappingtool></tr:MetaData><tr:ByteCodeJar/><tr:SourceStructure/><tr:TargetStructure/><tr:Multiplicity>1:1</tr:Multiplicity><tr:SourceParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:SourceParameters><tr:TargetParameters><tr:Parameter><tr:Position>1</tr:Position><tr:Minoccurs>1</tr:Minoccurs><tr:Maxoccurs>1</tr:Maxoccurs></tr:Parameter></tr:TargetParameters></tr:XiTrafo></content></xiObj>`;

    // Create mapping resource
    const mappingResource = new MappingResource(
        "OrderMapping.mmap",
        mappingContent
    );
    flow.addResource(mappingResource);

    console.log('   ✓ OrderMapping.mmap created (SAP XI Transformation format)');
    console.log('   ✓ Field mappings: OrderID→InvoiceID, Customer→CustomerID, Amount→TotalAmount\n');

    console.log('3. Creating MessageMapping component...');

    // Create Message Mapping component
    const mapping = new MessageMapping(
        "MapOrder",
        "OrderMapping.mmap"
    );
    flow.addComponent(mapping);

    console.log('   ✓ MapOrder component created');
    console.log('   ✓ References OrderMapping.mmap\n');

    // Verify no duplicate property
    const mappingProps: any = mapping;
    if (mappingProps.properties.mappingName !== undefined) {
        console.log('   ❌ ERROR: Duplicate mappingName property detected!');
        process.exit(1);
    }
    console.log('   ✓ No duplicate mappingName property\n');

    console.log('4. Compiling to ZIP...');
    const zipBuffer = await compileToZip(flow);
    const zipPath = 'MappingResourceTest.zip';
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`   ✓ ZIP created: ${zipPath} (${zipBuffer.length} bytes)\n`);

    console.log('5. Verifying package contents...');
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    const hasXsdSource = entries.some((e: any) => e.entryName.includes('OrderSource.xsd'));
    const hasXsdTarget = entries.some((e: any) => e.entryName.includes('InvoiceTarget.xsd'));
    const hasMmap = entries.some((e: any) => e.entryName.includes('OrderMapping.mmap'));
    const hasIflw = entries.some((e: any) => e.entryName.endsWith('.iflw'));

    console.log(`   OrderSource.xsd: ${hasXsdSource ? '✓' : '✗'}`);
    console.log(`   InvoiceTarget.xsd: ${hasXsdTarget ? '✓' : '✗'}`);
    console.log(`   OrderMapping.mmap: ${hasMmap ? '✓' : '✗'}`);
    console.log(`   MappingResourceTest.iflw: ${hasIflw ? '✓' : '✗'}\n`);

    if (!hasXsdSource || !hasXsdTarget || !hasMmap || !hasIflw) {
        console.log('❌ ERROR: Missing required files in ZIP!');
        process.exit(1);
    }

    console.log('=' .repeat(70));
    console.log('✅ PROPER MappingResourceTest.zip CREATED');
    console.log('=' .repeat(70));
    console.log('\nPackage includes:');
    console.log('  ✓ Full SAP XI Transformation .mmap format (not placeholder)');
    console.log('  ✓ Source XSD schema (OrderSource.xsd)');
    console.log('  ✓ Target XSD schema (InvoiceTarget.xsd)');
    console.log('  ✓ .mmap file with XSD references in <lnks> section');
    console.log('  ✓ Field mappings defined in transformation section');
    console.log('  ✓ NO duplicate mappingName property (compiler fix applied)');
    console.log('\nReady for SAP Integration Suite import!\n');
}

generateProperMappingResourceTest().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
