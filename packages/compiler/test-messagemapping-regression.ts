/**
 * Regression test - Message Mapping schema-reference fix
 *
 * Root cause (reported via a real generated ZIP, CustomerSyncFlow.zip):
 * MappingResource.generateProperSapFormat() -- the auto-enhancement that
 * turns minimal/placeholder .mmap content into a full SAP XI Transformation
 * structure -- hardcoded "SourceSchema.xsd"/"TargetSchema.xsd" as the
 * linked schemas and "Source"/"Target" as root element names, regardless
 * of what XSD resources the flow actually packaged. The generated ZIP
 * contained a real "Customer.xsd" resource, but the .mmap referenced
 * "SourceSchema.xsd"/"TargetSchema.xsd" -- files that were never packaged.
 * SAP opened the Message Mapping with empty Source/Target structures and
 * validation errors.
 *
 * Fix: a mapping resource's schema references are now explicit
 * (sourceXsd/sourceRootElement, targetXsd/targetRootElement on the
 * resources[] "mapping" entry), validated against the xsd resources
 * actually declared in the same JSON, and used verbatim in the generated
 * <lnks> section and transformation root paths -- never invented. When no
 * schema info is given at all, the generated mapping omits the <lnks>
 * section entirely (an honest "unlinked, configure in SAP" state) instead
 * of inventing a filename that doesn't exist.
 *
 * Covers:
 *   1. The corrected CustomerSyncFlow scenario end-to-end (fromJson ->
 *      validate -> compileToZip -> inspect .mmap), confirming every XSD
 *      referenced by the .mmap is actually packaged at the exact path
 *      referenced, with the real root element names.
 *   2. A mapping referencing an xsd NOT declared in resources[] is rejected.
 *   3. A mapping giving only sourceXsd without sourceRootElement (or vice
 *      versa) is rejected -- an incomplete pair is not silently accepted.
 *   4. Backward compatibility: minimal content with NO schema info still
 *      compiles successfully (no hard requirement was added), and the
 *      generated .mmap contains no invented schema filename.
 *   5. Full/real .mmap content (mimicking a real SAP-exported mapping)
 *      passes through completely unchanged, regardless of schema info.
 *   6. No duplicated resource path segments (xsd/xsd/, mapping/mapping/).
 */

import { fromJson, validate, compileToZip, IFlowJson } from './src/index';
import { listZipEntries, readZipEntry } from './scripts/inspectZip';

let failures = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        console.log(`  PASS: ${message}`);
    } else {
        console.error(`  FAIL: ${message}`);
        failures++;
    }
}

const CUSTOMER_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Customer">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="CustomerId" type="xs:string"/>
        <xs:element name="Name" type="xs:string"/>
        <xs:element name="Email" type="xs:string" minOccurs="0"/>
        <xs:element name="Phone" type="xs:string" minOccurs="0"/>
        <xs:element name="Address" type="xs:string" minOccurs="0"/>
        <xs:element name="Operation" type="xs:string"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

const TARGET_XSD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Target">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Id" type="xs:string"/>
        <xs:element name="FullName" type="xs:string"/>
        <xs:element name="ContactEmail" type="xs:string" minOccurs="0"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

async function main() {
    console.log('=== Regression: Message Mapping schema-reference fix ===\n');

    // ------------------------------------------------------------------
    // [1] Corrected CustomerSyncFlow scenario, end-to-end
    // ------------------------------------------------------------------
    console.log('[1] CustomerSyncFlow: HTTPS -> Validate -> Enrich -> Transform (Message Mapping) -> HTTP');
    const flowJson: IFlowJson = {
        name: 'CustomerSyncFlow',
        sender: { type: 'HTTPS', config: { address: '/customer/sync' } },
        components: [
            { id: 'validateCustomer', type: 'XmlValidator', config: { name: 'Validate Customer', xsd: 'Customer.xsd' } },
            { id: 'enrichCustomer', type: 'GroovyScript', config: { name: 'Enrich Customer', scriptName: 'enrichCustomer.groovy' } },
            { id: 'transformCustomer', type: 'MessageMapping', config: { name: 'Transform Customer', mappingName: 'Customer_to_Target.mmap' } }
        ],
        connections: [
            { from: 'sender', to: 'validateCustomer' },
            { from: 'validateCustomer', to: 'enrichCustomer' },
            { from: 'enrichCustomer', to: 'transformCustomer' },
            { from: 'transformCustomer', to: 'receiver' }
        ],
        receiver: { type: 'HTTP', config: { url: 'https://downstream.example.com/customer', method: 'POST' } },
        resources: [
            { type: 'xsd', name: 'Customer.xsd', content: CUSTOMER_XSD },
            { type: 'xsd', name: 'Target.xsd', content: TARGET_XSD },
            {
                type: 'mapping',
                name: 'Customer_to_Target.mmap',
                content: '<?xml version="1.0"?><mapping></mapping>',
                sourceXsd: 'Customer.xsd',
                sourceRootElement: 'Customer',
                targetXsd: 'Target.xsd',
                targetRootElement: 'Target'
            } as any,
            { type: 'groovy', name: 'enrichCustomer.groovy', content: "import com.sap.gateway.ip.core.customdev.util.Message\n\nMessage processData(Message message) {\n    return message\n}" }
        ]
    };

    const flow = fromJson(flowJson);
    const flowValidation = validate(flow);
    console.log('  validate():', JSON.stringify(flowValidation));
    assert(flowValidation.valid, 'CustomerSyncFlow validates with zero errors');

    const zip = await compileToZip(flow);
    assert(zip.length > 0, 'compileToZip() produces a non-empty ZIP');
    const entries = listZipEntries(zip);

    assert(entries.includes('src/main/resources/xsd/Customer.xsd'), 'Customer.xsd is packaged at the exact expected path');
    assert(entries.includes('src/main/resources/xsd/Target.xsd'), 'Target.xsd is packaged at the exact expected path');
    assert(entries.includes('src/main/resources/mapping/Customer_to_Target.mmap'), 'Customer_to_Target.mmap is packaged at the exact expected path');
    assert(!entries.some(e => e.includes('xsd/xsd/')), 'no doubled xsd/xsd/ resource path');
    assert(!entries.some(e => e.includes('mapping/mapping/')), 'no doubled mapping/mapping/ resource path');

    const mmap = readZipEntry(zip, entries.find(e => e.endsWith('Customer_to_Target.mmap'))!).toString('utf-8');
    console.log('\n  Generated .mmap <lnks> section:');
    console.log('   ', mmap.match(/<lnks>[\s\S]*?<\/lnks>/)?.[0]);

    assert(mmap.includes('<elem>Customer.xsd</elem>'), '.mmap references Customer.xsd (the ACTUAL packaged source schema, not an invented "SourceSchema.xsd")');
    assert(mmap.includes('<elem>Target.xsd</elem>'), '.mmap references Target.xsd (the ACTUAL packaged target schema, not an invented "TargetSchema.xsd")');
    assert(!mmap.includes('SourceSchema.xsd'), '.mmap does NOT contain the old invented "SourceSchema.xsd" filename');
    assert(!mmap.includes('TargetSchema.xsd'), '.mmap does NOT contain the old invented "TargetSchema.xsd" filename');
    assert(/<key typeID="xsd" version="1\.1"><elem>Customer\.xsd<\/elem><elem>src\/main\/resources\/xsd<\/elem><elem>Customer<\/elem><\/key>/.test(mmap), 'source <lnkRole> links Customer.xsd with root element "Customer" (matches the real XSD, not "Source")');
    assert(/<key typeID="xsd" version="1\.1"><elem>Target\.xsd<\/elem><elem>src\/main\/resources\/xsd<\/elem><elem>Target<\/elem><\/key>/.test(mmap), 'target <lnkRole> links Target.xsd with root element "Target"');
    assert(mmap.includes('path="/Customer" type="Src"'), 'transformation source brick path uses the real root element "/Customer" (not the generic "/Source")');
    assert(mmap.includes('path="/Target" type="Dst"'), 'transformation target brick path uses the real root element "/Target"');

    // Verify EVERY .xsd filename the .mmap references is actually packaged
    // at the exact path it references -- the literal acceptance criterion.
    const referencedXsds = [...mmap.matchAll(/<elem>([^<]+\.xsd)<\/elem>/g)].map(m => m[1]);
    assert(referencedXsds.length === 2, `exactly 2 xsd references found in the .mmap (found ${referencedXsds.length})`);
    referencedXsds.forEach(xsdName => {
        assert(entries.includes(`src/main/resources/xsd/${xsdName}`), `referenced schema "${xsdName}" exists in the ZIP at the exact path the .mmap points to`);
    });

    // ------------------------------------------------------------------
    // [2] Mapping referencing an XSD that isn't packaged is rejected
    // ------------------------------------------------------------------
    console.log('\n[2] Mapping referencing an unpackaged XSD is rejected');
    let threwOnMissingXsd = false;
    try {
        fromJson({
            name: 'x',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'm', type: 'MessageMapping', config: { name: 'Map', mappingName: 'M.mmap' } }],
            connections: [{ from: 'sender', to: 'm' }, { from: 'm', to: 'receiver' }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
            resources: [
                { type: 'mapping', name: 'M.mmap', content: '<mapping></mapping>', sourceXsd: 'DoesNotExist.xsd', sourceRootElement: 'Root' } as any
            ]
        });
    } catch (err) {
        threwOnMissingXsd = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMissingXsd, 'fromJson() throws when a mapping references an xsd not declared in resources[]');

    // ------------------------------------------------------------------
    // [3] Incomplete schema-reference pair is rejected
    // ------------------------------------------------------------------
    console.log('\n[3] Incomplete xsd/rootElement pair is rejected');
    let threwOnIncompletePair = false;
    try {
        fromJson({
            name: 'x',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'm', type: 'MessageMapping', config: { name: 'Map', mappingName: 'M.mmap' } }],
            connections: [{ from: 'sender', to: 'm' }, { from: 'm', to: 'receiver' }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
            resources: [
                { type: 'xsd', name: 'Real.xsd', content: '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"/></xs:schema>' },
                { type: 'mapping', name: 'M.mmap', content: '<mapping></mapping>', sourceXsd: 'Real.xsd' } as any
            ]
        });
    } catch (err) {
        threwOnIncompletePair = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnIncompletePair, 'fromJson() throws when sourceXsd is given without sourceRootElement');

    // ------------------------------------------------------------------
    // [4] Backward compatibility: no schema info at all still compiles,
    // and no longer invents a fake schema filename
    // ------------------------------------------------------------------
    console.log('\n[4] Minimal content with NO schema info still compiles (backward compatible), without inventing filenames');
    const noSchemaFlow = fromJson({
        name: 'No Schema Info Flow',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [{ id: 'm2', type: 'MessageMapping', config: { name: 'Map', mappingName: 'Unlinked.mmap' } }],
        connections: [{ from: 'sender', to: 'm2' }, { from: 'm2', to: 'receiver' }],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
        resources: [
            { type: 'mapping', name: 'Unlinked.mmap', content: '<mapping></mapping>' }
        ]
    });
    assert(validate(noSchemaFlow).valid, 'a mapping with no schema info still validates');
    const noSchemaZip = await compileToZip(noSchemaFlow);
    const noSchemaMmap = readZipEntry(noSchemaZip, listZipEntries(noSchemaZip).find(e => e.endsWith('Unlinked.mmap'))!).toString('utf-8');
    assert(noSchemaMmap.includes('<lnks></lnks>'), 'with no schema info, <lnks> is empty rather than pointing at an invented filename');
    assert(!noSchemaMmap.includes('SourceSchema.xsd') && !noSchemaMmap.includes('TargetSchema.xsd'), 'no invented "SourceSchema.xsd"/"TargetSchema.xsd" filenames appear anywhere');
    assert(noSchemaMmap.includes('path="/Source"') && noSchemaMmap.includes('path="/Target"'), 'falls back to the generic "/Source"/"/Target" brick paths when no real root element name is known');

    // ------------------------------------------------------------------
    // [5] Full/real .mmap content passes through completely unchanged
    // ------------------------------------------------------------------
    console.log('\n[5] Full, real .mmap content passes through unchanged regardless of schema info');
    const realMmapContent = `<xiObj xmlns="urn:sap-com:xi">${'x'.repeat(500)}<lnks/><content><tr:XiTrafo xmlns:tr="urn:sap-com:xi:mapping:xitrafo"><transformation/></tr:XiTrafo></content></xiObj>`;
    const realMmapFlow = fromJson({
        name: 'Real Mmap Flow',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [{ id: 'm3', type: 'MessageMapping', config: { name: 'Map', mappingName: 'Real.mmap' } }],
        connections: [{ from: 'sender', to: 'm3' }, { from: 'm3', to: 'receiver' }],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
        resources: [{ type: 'mapping', name: 'Real.mmap', content: realMmapContent }]
    });
    const realMmapZip = await compileToZip(realMmapFlow);
    const packagedRealMmap = readZipEntry(realMmapZip, listZipEntries(realMmapZip).find(e => e.endsWith('Real.mmap'))!).toString('utf-8');
    assert(packagedRealMmap === realMmapContent, 'real, full .mmap content (500+ chars, has xiObj/lnks/transformation) is packaged completely unchanged, not re-generated');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
