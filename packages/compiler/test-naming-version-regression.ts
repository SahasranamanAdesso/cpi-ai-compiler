/**
 * Regression test - SAP Cloud Integration naming/version/duplicate-ID fixes
 *
 * Covers the three scenarios required for this fix:
 *   TEST 1: "Receive an order over HTTPS and send the result to an HTTPS
 *            downstream service." (simple flow, no JDBC)
 *   TEST 2: "Receive an order over HTTPS, use JDBC to query customer
 *            information, enrich the order with the database result, and
 *            send the final result to an HTTPS downstream service."
 *   TEST 3: "Receive invoices from an external system, validate the invoice
 *            data, check whether the invoice is domestic or international,
 *            process each type differently, and send the final invoice
 *            information to the appropriate downstream system." (the
 *            existing Router + ProcessCall "Domestic/International
 *            Processing Service" scenario -- must not regress)
 *
 * Plus a direct replay of test/multiple-processcall-regression.test.ts's
 * assertions (that test uses Jest syntax but Jest is not installed in this
 * repo -- see its own file -- so it is not actually runnable; this replays
 * its logic with this repo's plain-script assertion pattern instead).
 */

import { fromJson, validate, compileToZip, getCapabilities, IFlowJson } from './src/index';
import { listZipEntries, readZipEntry, printZipTree } from './scripts/inspectZip';

let failures = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        console.log(`  PASS: ${message}`);
    } else {
        console.error(`  FAIL: ${message}`);
        failures++;
    }
}

function isValidNCName(s: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(s);
}

function getChannelNames(xml: string): { id: string; name: string }[] {
    return [...xml.matchAll(/<bpmn2:messageFlow id="([^"]+)" name="([^"]+)"/g)].map(m => ({ id: m[1], name: m[2] }));
}

function getElementIds(xml: string): string[] {
    return [...xml.matchAll(/<bpmn2:(?:callActivity|serviceTask|startEvent|endEvent|exclusiveGateway|parallelGateway) id="([^"]+)"/g)].map(m => m[1]);
}

async function main() {
    console.log('=== Regression: naming, versioning, duplicate-ID fixes ===\n');

    // ==================================================================
    // TEST 1: "Receive an order over HTTPS and send the result to an
    // HTTPS downstream service."
    // ==================================================================
    console.log('=== TEST 1: simple HTTPS -> HTTPS ===\n');
    const test1Json: IFlowJson = {
        name: 'Order Receive and Forward',
        sender: { type: 'HTTPS', config: { address: '/orders' } },
        receiver: { type: 'HTTPS', config: { name: 'Send to Downstream Service', url: 'https://downstream.example.com/orders', method: 'POST' } }
    };
    const flow1 = fromJson(test1Json);
    const validation1 = validate(flow1);
    console.log('  validate():', JSON.stringify(validation1));
    assert(validation1.valid, 'TEST 1 validates cleanly');
    const zip1 = await compileToZip(flow1);
    const entries1 = listZipEntries(zip1);
    const iflw1 = readZipEntry(zip1, entries1.find(e => e.endsWith('.iflw'))!).toString('utf-8');
    const channels1 = getChannelNames(iflw1);
    console.log('  Channels:', JSON.stringify(channels1));
    assert(channels1.every(c => isValidNCName(c.name)), 'TEST 1: all channel names are valid NCNames');
    assert(channels1.every(c => !/\s/.test(c.name)), 'TEST 1: no channel name contains whitespace');
    assert(iflw1.includes('<value>HTTP</value>') && !iflw1.includes('direction::Receiver/version::1.5.2'), 'TEST 1: receiver uses ComponentType=HTTP, not HTTPS-at-1.5.2');
    assert(iflw1.includes('urlPath') && iflw1.match(/<key>urlPath<\/key>\s*<value>(\/[^<]*)<\/value>/) !== null, 'TEST 1: sender address is a relative path starting with "/"');

    // ==================================================================
    // TEST 2: "Receive an order over HTTPS, use JDBC to query customer
    // information, enrich the order with the database result, and send
    // the final result to an HTTPS downstream service."
    // ==================================================================
    console.log('\n=== TEST 2: HTTPS -> JDBC -> enrich -> HTTPS ===\n');
    const test2Json: IFlowJson = {
        name: 'Order Enrichment with Customer Data via JDBC',
        sender: { type: 'HTTPS', config: { address: '/orders' } },
        components: [
            {
                id: 'setCustomerQuery',
                type: 'ContentModifier',
                config: {
                    name: 'Set Customer Query',
                    bodyType: 'constant',
                    wrapContent: "SELECT CUSTOMER_ID, NAME, CREDIT_LIMIT FROM CUSTOMERS WHERE CUSTOMER_ID = ${header.customerId}"
                }
            },
            {
                id: 'queryCustomerDb',
                type: 'JdbcCall',
                config: { name: 'Query Customer DB', dataSourceAlias: 'CUSTOMER_DB' }
            },
            {
                id: 'enrichOrderWithCustomerData',
                type: 'ContentModifier',
                config: { name: 'Enrich Order With Customer Data', bodyType: 'expression' }
            }
        ],
        connections: [
            { from: 'sender', to: 'setCustomerQuery' },
            { from: 'setCustomerQuery', to: 'queryCustomerDb' },
            { from: 'queryCustomerDb', to: 'enrichOrderWithCustomerData' },
            { from: 'enrichOrderWithCustomerData', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { name: 'Downstream Service', url: 'https://downstream.example.com/orders/final', method: 'POST' } }
    };

    console.log('AI JSON:');
    console.log(JSON.stringify(test2Json, null, 2));

    const flow2 = fromJson(test2Json);
    const validation2 = validate(flow2);
    console.log('\nvalidate():', JSON.stringify(validation2));
    assert(validation2.valid, 'TEST 2 validates cleanly');
    assert(validation2.errors.length === 0, 'TEST 2 has no validation errors');

    const zip2 = await compileToZip(flow2);
    const entries2 = printZipTree(zip2, 'TEST 2 ZIP');
    const iflwName2 = entries2.find(e => e.endsWith('.iflw'))!;
    const iflw2 = readZipEntry(zip2, iflwName2).toString('utf-8');

    console.log('\n--- Generated .iflw (TEST 2) ---\n');
    console.log(iflw2);

    const channels2 = getChannelNames(iflw2);
    console.log('\nChannels:', JSON.stringify(channels2));
    assert(channels2.every(c => isValidNCName(c.name)), 'TEST 2: all channel names are valid NCNames');
    assert(channels2.every(c => !/\s/.test(c.name)), 'TEST 2: no channel name contains whitespace');
    assert(new Set(channels2.map(c => c.name)).size === channels2.length, 'TEST 2: all channel names are unique');

    const ids2 = getElementIds(iflw2);
    assert(new Set(ids2).size === ids2.length, `TEST 2: all BPMN element ids are unique (${ids2.length} elements)`);

    assert(iflw2.includes('<value>JDBC</value>') && iflw2.includes('<key>Vendor</key>') && iflw2.includes('<value>SAP</value>'), 'TEST 2: JDBC messageFlow present with Vendor=SAP');
    assert(iflw2.includes('ctype::AdapterVariant/cname::JDBC/vendor::SAP/tp::JDBC/mp::JDBC/direction::Receiver/version::1.5.3'), 'TEST 2: JDBC cmdVariantUri matches reference JDBC export version 1.5.3');
    assert(iflw2.includes('ctype::AdapterVariant/cname::sap:HTTP/tp::HTTP/mp::None/direction::Receiver/version::1.16.1'), 'TEST 2: HTTPS-configured receiver emits HTTP/1.16.1 (not HTTPS/1.5)');
    assert(!iflw2.includes('cname::sap:HTTPS/tp::HTTPS/mp::None/direction::Receiver'), 'TEST 2: no HTTPS-typed Receiver variant anywhere in the iflw');

    // ==================================================================
    // TEST 3: "Receive invoices from an external system, validate the
    // invoice data, check whether the invoice is domestic or
    // international, process each type differently, and send the final
    // invoice information to the appropriate downstream system."
    // (the existing Router + ProcessCall "Domestic/International
    // Processing Service" scenario -- must not regress)
    // ==================================================================
    console.log('\n\n=== TEST 3: invoice validate -> route domestic/international -> ProcessCall -> HTTPS ===\n');
    const INVOICE_SCHEMA_XSD = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Invoice"><xs:complexType><xs:sequence><xs:element name="InvoiceId" type="xs:string"/><xs:element name="Country" type="xs:string"/></xs:sequence></xs:complexType></xs:element></xs:schema>`;

    const test3Json: IFlowJson = {
        name: 'Invoice Processing Domestic International',
        sender: { type: 'HTTPS', config: { address: '/invoices/receive' } },
        components: [
            {
                id: 'validateInvoice',
                type: 'XmlValidator',
                config: { name: 'Validate Invoice Data', xsd: 'InvoiceSchema.xsd' }
            },
            {
                id: 'classifyInvoice',
                type: 'Router',
                config: {
                    name: 'Check Domestic or International',
                    routes: [{ condition: "${header.country} == 'US'", target: 'domesticService' }],
                    defaultRoute: { target: 'internationalService' }
                }
            },
            {
                id: 'domesticService',
                type: 'ProcessCall',
                config: { name: 'Domestic Processing Service', processId: 'domestic_sub_process' }
            },
            {
                id: 'internationalService',
                type: 'ProcessCall',
                config: { name: 'International Processing Service', processId: 'international_sub_process' }
            }
        ],
        connections: [
            { from: 'sender', to: 'validateInvoice' },
            { from: 'validateInvoice', to: 'classifyInvoice' },
            { from: 'classifyInvoice', to: 'domesticService' },
            { from: 'classifyInvoice', to: 'internationalService' },
            { from: 'domesticService', to: 'receiver' },
            { from: 'internationalService', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { name: 'Downstream Invoice System', url: 'https://downstream.example.com/invoices', method: 'POST' } },
        resources: [{ type: 'xsd', name: 'InvoiceSchema.xsd', content: INVOICE_SCHEMA_XSD }]
    };

    const flow3 = fromJson(test3Json);

    // --- Replay of test/multiple-processcall-regression.test.ts assertions ---
    const components3 = flow3.getComponents();
    const compIds3 = components3.map(c => c.id);
    assert(new Set(compIds3).size === compIds3.length, `TEST 3: all ${compIds3.length} component ids are unique (no CP-001)`);
    assert(compIds3.includes('domesticService') && compIds3.includes('internationalService'), 'TEST 3: AI-provided logical component ids are preserved');

    const validation3 = validate(flow3);
    console.log('  validate():', JSON.stringify(validation3));
    assert(validation3.valid, 'TEST 3 validates cleanly (existing invoice scenario does not regress)');
    const dup3 = validation3.errors.filter(e => e.code === 'CP-001');
    assert(dup3.length === 0, 'TEST 3: no CP-001 duplicate ID errors');

    const zip3 = await compileToZip(flow3);
    assert(zip3.length > 0, 'TEST 3: ZIP generated');
    const entries3 = listZipEntries(zip3);
    const iflw3 = readZipEntry(zip3, entries3.find(e => e.endsWith('.iflw'))!).toString('utf-8');

    const channels3 = getChannelNames(iflw3);
    assert(channels3.every(c => isValidNCName(c.name) && !/\s/.test(c.name)), 'TEST 3: all channel names are valid NCNames with no whitespace');
    assert(iflw3.includes('name="Domestic Processing Service"') || iflw3.includes('id="domesticService"'), 'TEST 3: Domestic Processing Service step present (display name kept human-readable on callActivity)');
    assert(iflw3.includes('name="International Processing Service"') || iflw3.includes('id="internationalService"'), 'TEST 3: International Processing Service step present');
    assert(iflw3.includes('<bpmn2:exclusiveGateway'), 'TEST 3: Router present as exclusiveGateway');
    const ids3 = getElementIds(iflw3);
    assert(new Set(ids3).size === ids3.length, 'TEST 3: all BPMN element ids in the generated XML are unique');

    // --- Direct check of the naming example from this task's spec:
    // "Domestic Processing Service" -> "Domestic_Processing_Service" as a
    // TECHNICAL name IF it were ever used as a channel (it isn't here --
    // ProcessCall's name is a callActivity label, not NCName-constrained --
    // but confirm the shared utility itself produces the exact spec'd output). ---
    const { toXmlTechnicalName } = require('./src/utils/XmlName');
    assert(toXmlTechnicalName('Domestic Processing Service', 'x') === 'Domestic_Processing_Service', 'naming utility: "Domestic Processing Service" -> "Domestic_Processing_Service"');
    assert(toXmlTechnicalName('International Processing Service', 'x') === 'International_Processing_Service', 'naming utility: "International Processing Service" -> "International_Processing_Service"');
    assert(toXmlTechnicalName('Query Customer DB', 'x') === 'Query_Customer_DB', 'naming utility: "Query Customer DB" -> "Query_Customer_DB"');
    assert(toXmlTechnicalName('Customer Order Flow', 'x') === 'Customer_Order_Flow', 'naming utility: "Customer Order Flow" -> "Customer_Order_Flow"');

    // ==================================================================
    // Duplicate-ID stress test: two components with the SAME AI-supplied
    // id (a real mistake an AI could make) must not silently collide --
    // and two components whose DIFFERENT ids sanitize to the SAME
    // technical name must also not collide.
    // ==================================================================
    console.log('\n=== Duplicate-ID stress test ===\n');
    const dupIdJson: IFlowJson = {
        name: 'Duplicate Id Stress Test',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            { id: 'Query Customer DB', type: 'ContentModifier', config: { name: 'First' } },
            { id: 'Query Customer DB', type: 'ContentModifier', config: { name: 'Second (literal duplicate id)' } },
            { id: 'Query_Customer_DB', type: 'ContentModifier', config: { name: 'Third (sanitizes to same name as the first two)' } }
        ],
        connections: [
            { from: 'sender', to: 'Query Customer DB' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const dupFlow = fromJson(dupIdJson);
    const dupIds = dupFlow.getComponents().map(c => c.id);
    console.log('  Resolved technical ids:', dupIds);
    assert(new Set(dupIds).size === 3, 'three components with colliding raw/sanitized ids all get distinct technical ids');
    assert(dupIds.every(id => isValidNCName(id)), 'all resolved technical ids are valid NCNames');
    const dupValidation = validate(dupFlow);
    assert(dupValidation.errors.filter(e => e.code === 'CP-001').length === 0, 'no CP-001 errors despite colliding AI-supplied ids');

    // ==================================================================
    // getCapabilities() sanity: unaffected by this change
    // ==================================================================
    const caps = getCapabilities();
    assert(caps.components.length > 0 && caps.adapters.length > 0, 'getCapabilities() still returns components/adapters');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
