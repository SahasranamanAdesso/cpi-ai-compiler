/**
 * Generate fresh MappingResourceTest ZIP with updated compiler
 * This will be the ACTUAL package to import into SAP
 */

import { fromJson, compileToZip } from './packages/compiler/src';
import * as fs from 'fs';

async function generateFreshMappingTest() {
    console.log('\n=== GENERATING FRESH MappingResourceTest ZIP ===\n');

    const json = {
        name: 'MappingResourceTest',
        sender: {
            type: 'HTTPS' as const,
            config: { address: '/test' }
        },
        receiver: {
            type: 'HTTP' as const,
            config: { url: 'https://example.com', method: 'POST' }
        },
        components: [
            {
                id: 'mapping1',
                type: 'MessageMapping' as const,
                config: {
                    name: 'MapOrder',
                    mappingName: 'OrderMapping.mmap'
                }
            }
        ],
        resources: [
            {
                type: 'mapping' as const,
                name: 'OrderMapping.mmap',
                content: '<mapping xmlns="http://sap.com/xi/mapping">Order to Invoice mapping</mapping>'
            }
        ]
    };

    console.log('1. Creating flow from JSON...');
    const flow = fromJson(json);
    console.log(`   ✓ Flow: ${flow.name}`);
    console.log(`   ✓ Components: ${flow.getComponents().length}`);
    console.log(`   ✓ Resources: ${flow.getResources().length}\n`);

    const mapping: any = flow.getComponents()[0];
    console.log('2. MessageMapping component properties:');
    console.log(`   mappingType: ${mapping.properties.mappingType}`);
    console.log(`   mappingReference: ${mapping.properties.mappingReference}`);
    console.log(`   mappingname: ${mapping.properties.mappingname}`);
    console.log(`   mappingpath: ${mapping.properties.mappingpath}`);
    console.log(`   mappinguri: ${mapping.properties.mappinguri}`);
    console.log(`   mappingName (should be undefined): ${mapping.properties.mappingName}\n`);

    if (mapping.properties.mappingName !== undefined) {
        console.log('   ❌ ERROR: mappingName property still exists!');
        process.exit(1);
    }

    console.log('3. Compiling to ZIP...');
    const zipBuffer = await compileToZip(flow);
    const zipPath = 'MappingResourceTest-FRESH.zip';
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`   ✓ ZIP created: ${zipPath} (${zipBuffer.length} bytes)\n`);

    console.log('4. Extracting and inspecting .iflw...');
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipBuffer);
    const iflwEntry = zip.getEntries().find((e: any) => e.entryName.endsWith('.iflw'));

    if (!iflwEntry) {
        console.log('   ❌ ERROR: .iflw not found in ZIP');
        process.exit(1);
    }

    const iflwContent = iflwEntry.getData().toString('utf8');
    const iflwPath = 'MappingResourceTest-FRESH.iflw';
    fs.writeFileSync(iflwPath, iflwContent);
    console.log(`   ✓ .iflw extracted: ${iflwPath}\n`);

    console.log('5. Checking BPMN properties...');
    const hasMappingname = iflwContent.includes('<key>mappingname</key>');
    const hasMappingName = iflwContent.includes('<key>mappingName</key>');
    const hasMappingpath = iflwContent.includes('<key>mappingpath</key>');
    const hasMappinguri = iflwContent.includes('<key>mappinguri</key>');

    console.log(`   mappingname (lowercase): ${hasMappingname ? '✓ Present' : '✗ MISSING'}`);
    console.log(`   mappingName (camelCase): ${hasMappingName ? '✗ PRESENT (BUG!)' : '✓ Absent'}`);
    console.log(`   mappingpath: ${hasMappingpath ? '✓ Present' : '✗ MISSING'}`);
    console.log(`   mappinguri: ${hasMappinguri ? '✓ Present' : '✗ MISSING'}\n`);

    if (hasMappingName) {
        console.log('❌ REGRESSION: camelCase mappingName property found in BPMN!');
        process.exit(1);
    }

    if (!hasMappingname || !hasMappingpath || !hasMappinguri) {
        console.log('❌ ERROR: Required properties missing!');
        process.exit(1);
    }

    console.log('✅ SUCCESS: MappingResourceTest-FRESH.zip is ready for SAP import!');
    console.log('\nNext steps:');
    console.log('1. Import MappingResourceTest-FRESH.zip into SAP Integration Suite');
    console.log('2. Check if red X errors are gone');
    console.log('3. Verify MapOrder component opens without errors\n');
}

generateFreshMappingTest().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
