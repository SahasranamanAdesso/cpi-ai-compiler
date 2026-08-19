/**
 * Regression test - "Receive customer data, validate it, and store it."
 *
 * Reproduces the exact end-to-end scenario reported from cpi-ai-platform:
 * AI-generated compiler JSON -> fromJson() -> validate() -> compileToZip().
 *
 * Covers two real payloads seen in production logs:
 *   - Attempt 1: sender.config.allowedMethods sent as a raw string "POST"
 *     (previously crashed the compiler with "allowedMethods.join is not
 *     a function" -- this test asserts it no longer throws).
 *   - Attempt 2: the payload that previously succeeded and produced a ZIP
 *     that SAP Integration Suite's package-level Import screen rejected
 *     with "Could not import this file; select a valid content package"
 *     (root cause: LF vs CRLF line endings, see PACKAGE-FORMAT-FINDINGS.md),
 *     and which, once it did import, SAP's editor flagged with two
 *     design-time validation errors: "retention threshold for alerting
 *     cannot be empty" (DataStore missing the "alert" property) and
 *     "customer schema does not exist" (XmlValidator's xsd path not
 *     prefixed with the /xsd/ folder it's actually packaged under).
 *
 * IMPORTANT SCOPE NOTE (see PACKAGE-FORMAT-FINDINGS.md for detail):
 * This test can only verify what is checkable *locally*: that the
 * compiler JSON validates, that a .iflw is generated, that the ZIP is
 * generated, that expected resources are packaged, and that the ZIP
 * matches the single-Integration-Flow-artifact structure this repo has
 * real SAP-exported evidence for (reference/sap-exports/agg-test).
 * It CANNOT verify acceptance by SAP Integration Suite's Import screen --
 * that requires a real tenant and is explicitly out of scope for an
 * automated, offline test.
 */

import { fromJson, validate, compileToZip, IFlowJson } from './src/index';
import { printZipTree, readZipEntry } from './scripts/inspectZip';

let failures = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        console.log(`  PASS: ${message}`);
    } else {
        console.error(`  FAIL: ${message}`);
        failures++;
    }
}

const CUSTOMER_SCHEMA_XSD = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Customer"><xs:complexType><xs:sequence><xs:element name="id" type="xs:string"/><xs:element name="name" type="xs:string"/></xs:sequence></xs:complexType></xs:element></xs:schema>`;

function buildCustomerFlowJson(allowedMethods: string | string[] | undefined): IFlowJson {
    return {
        name: 'Receive Customer Data Flow',
        sender: {
            type: 'HTTPS',
            config: {
                address: '/customer/data',
                ...(allowedMethods !== undefined ? { allowedMethods } : {})
            }
        },
        components: [
            {
                id: 'validateCustomer',
                type: 'XmlValidator',
                config: {
                    name: 'Validate Customer XML',
                    xsd: 'CustomerSchema.xsd'
                }
            },
            {
                id: 'storeCustomer',
                type: 'DataStore',
                config: {
                    name: 'Store Customer Data',
                    operation: 'put',
                    storageName: 'CustomerStore',
                    entryId: '${header.customerId}',
                    visibility: 'local'
                }
            }
        ],
        receiver: {
            type: 'HTTPS',
            config: {
                url: 'https://api.example.com/acknowledgment',
                method: 'POST'
            }
        },
        connections: [
            { from: 'sender', to: 'validateCustomer' },
            { from: 'validateCustomer', to: 'storeCustomer' },
            { from: 'storeCustomer', to: 'receiver' }
        ],
        resources: [
            {
                type: 'xsd',
                name: 'CustomerSchema.xsd',
                content: CUSTOMER_SCHEMA_XSD
            }
        ]
    };
}

async function main() {
    console.log('=== Regression: "Receive customer data, validate it, and store it." ===\n');

    // --- Attempt 1 payload: allowedMethods sent as a raw string ---
    console.log('[1] AI attempt-1 payload (allowedMethods as string "POST")');
    const json1 = buildCustomerFlowJson('POST');
    let flow1;
    let threw = false;
    try {
        flow1 = fromJson(json1);
    } catch (err) {
        threw = true;
        console.error('  Unexpected throw:', err);
    }
    assert(!threw, 'fromJson() does not throw when allowedMethods is a raw string');
    if (flow1) {
        const sender = flow1.getSender() as any;
        assert(
            sender?.properties?.allowedMethods === 'POST',
            'allowedMethods normalizes to "POST" when given a single string'
        );
    }

    // --- Attempt 2 payload: array form (the one that reached ZIP generation) ---
    console.log('\n[2] AI attempt-2 payload (allowedMethods omitted, default applies)');
    const json2 = buildCustomerFlowJson(undefined);
    const flow2 = fromJson(json2);

    const validation = validate(flow2);
    console.log('  Validation result:', JSON.stringify(validation));
    assert(validation.valid === true, 'compiler JSON produces a valid IFlow (validate().valid === true)');
    assert(validation.errors.length === 0, 'no validation errors');

    const zipBuffer = await compileToZip(flow2);
    assert(zipBuffer.length > 0, 'ZIP buffer is generated and non-empty');

    const entries = printZipTree(zipBuffer, 'Generated ZIP');

    // --- Structural assertions against the single-artifact format this repo
    //     has real SAP-exported evidence for (reference/sap-exports/agg-test) ---
    const hasManifest = entries.includes('META-INF/MANIFEST.MF');
    const hasProject = entries.includes('.project');
    const hasMetainfo = entries.includes('metainfo.prop');
    const hasParamsProp = entries.includes('src/main/resources/parameters.prop');
    const hasParamsPropdef = entries.includes('src/main/resources/parameters.propdef');
    const hasIflw = entries.some(e => e.startsWith('src/main/resources/scenarioflows/integrationflow/') && e.endsWith('.iflw'));
    const hasXsd = entries.includes('src/main/resources/xsd/CustomerSchema.xsd');
    const rootLevelOnlyExpected = entries.every(e =>
        !e.includes('..') // no path traversal
    );

    assert(hasManifest, 'ZIP contains META-INF/MANIFEST.MF');
    assert(hasProject, 'ZIP contains .project');
    assert(hasMetainfo, 'ZIP contains metainfo.prop');
    assert(hasParamsProp, 'ZIP contains src/main/resources/parameters.prop');
    assert(hasParamsPropdef, 'ZIP contains src/main/resources/parameters.propdef');
    assert(hasIflw, 'ZIP contains a .iflw file under scenarioflows/integrationflow/');
    assert(hasXsd, 'ZIP contains the packaged XSD resource (src/main/resources/xsd/CustomerSchema.xsd)');
    assert(rootLevelOnlyExpected, 'no path-traversal entries in ZIP');

    // --- Line-ending regression check ---
    // Real SAP exports (reference/sap-exports/agg-test) use CRLF throughout
    // every scaffold file and the .iflw itself. A prior version of this
    // packager wrote bare LF, which is a plausible contributor to SAP
    // Integration Suite rejecting the ZIP as "not a valid content package"
    // (strict OSGi/JAR manifest parsers are sensitive to this).
    function hasOnlyCRLF(buf: Buffer): boolean {
        const text = buf.toString('utf-8');
        return !/[^\r]\n/.test(text) && !text.endsWith('\r');
    }
    const iflwEntryName = entries.find(e => e.startsWith('src/main/resources/scenarioflows/integrationflow/') && e.endsWith('.iflw'))!;
    assert(hasOnlyCRLF(readZipEntry(zipBuffer, 'META-INF/MANIFEST.MF')), 'MANIFEST.MF uses CRLF line endings (matches real SAP export)');
    assert(hasOnlyCRLF(readZipEntry(zipBuffer, '.project')), '.project uses CRLF line endings (matches real SAP export)');
    assert(hasOnlyCRLF(readZipEntry(zipBuffer, 'metainfo.prop')), 'metainfo.prop uses CRLF line endings (matches real SAP export)');
    assert(hasOnlyCRLF(readZipEntry(zipBuffer, 'src/main/resources/parameters.prop')), 'parameters.prop uses CRLF line endings (matches real SAP export)');
    assert(hasOnlyCRLF(readZipEntry(zipBuffer, iflwEntryName)), '.iflw uses CRLF line endings (matches real SAP export)');

    // --- SAP design-time validation regressions ---
    // These two were reported by the user after a successful import: SAP's
    // editor flagged "retention threshold for alerting cannot be empty" and
    // "customer schema does not exist" on this exact flow.
    const iflwXml = readZipEntry(zipBuffer, iflwEntryName).toString('utf-8');

    const xsdPropMatch = iflwXml.match(/<key>xsd<\/key>\s*<value>([^<]*)<\/value>/);
    assert(
        xsdPropMatch !== null && xsdPropMatch[1] === '/xsd/CustomerSchema.xsd',
        `XmlValidator's xsd property resolves to "/xsd/CustomerSchema.xsd", not the bare filename (got: ${JSON.stringify(xsdPropMatch && xsdPropMatch[1])})`
    );

    const alertPropMatch = iflwXml.match(/<key>alert<\/key>\s*<value>([^<]*)<\/value>/);
    assert(
        alertPropMatch !== null && alertPropMatch[1].trim().length > 0,
        `DataStore's alert (Retention Threshold for Alerting) property is non-empty (got: ${JSON.stringify(alertPropMatch && alertPropMatch[1])})`
    );

    console.log('\n--- What this test does NOT and cannot verify ---');
    console.log('  This structure matches the single-Integration-Flow-artifact format');
    console.log('  (real evidence: reference/sap-exports/agg-test). Whether SAP Integration');
    console.log('  Suite\'s package-level "Import" screen (Design > Integrations and APIs >');
    console.log('  Import) accepts this exact byte layout can only be confirmed against a');
    console.log('  real tenant -- see PACKAGE-FORMAT-FINDINGS.md.');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
