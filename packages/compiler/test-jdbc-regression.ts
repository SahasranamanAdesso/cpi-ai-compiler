/**
 * Regression test - JDBC adapter support
 *
 * Covers the scenarios from the JDBC extension task:
 *   1. One JDBC receiver (flow-level, via setReceiver/JdbcAdapter).
 *   2. Two JdbcCall instances (mid-flow) in the same flow -- no duplicate IDs.
 *   3. JDBC + existing components (ContentModifier -> JdbcCall -> GroovyScript).
 *   4. JDBC + resources (an unrelated XSD-validated component alongside JDBC).
 *   5. JDBC config validation (unsupported property rejected, missing
 *      dataSourceAlias rejected).
 *   6. fromJson() -> validate().
 *   7. compileToZip().
 *   8. Generated .iflw contains the expected JDBC messageFlow + serviceTask.
 *   9. Existing non-JDBC regression (customer-flow) still passes unaffected.
 */

import { fromJson, validate, compileToZip, IFlowJson, getCapabilities } from './src/index';
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

async function main() {
    console.log('=== Regression: JDBC adapter support ===\n');

    // --- 1. Capabilities discovery ---
    console.log('[1] getCapabilities() exposes JDBC');
    const caps = getCapabilities();
    const jdbcCallCap = caps.components.find(c => c.type === 'JdbcCall');
    const jdbcAdapterCap = caps.adapters.find(a => a.type === 'JDBC' && a.direction === 'Receiver');
    const jdbcSenderCap = caps.adapters.find(a => a.type === 'JDBC' && a.direction === 'Sender');
    assert(!!jdbcCallCap, 'capabilities.components includes JdbcCall');
    assert(!!jdbcAdapterCap, 'capabilities.adapters includes JDBC Receiver');
    assert(!jdbcSenderCap, 'capabilities.adapters does NOT include JDBC Sender (SAP CPI has none)');
    assert(!!jdbcCallCap?.requiredProperties.includes('dataSourceAlias'), 'JdbcCall requires dataSourceAlias');

    // --- 2. Single JDBC receiver at flow level ---
    console.log('\n[2] Single JDBC receiver (flow-level via setReceiver)');
    const singleReceiverJson: IFlowJson = {
        name: 'Single JDBC Receiver Flow',
        sender: { type: 'HTTPS', config: { address: '/orders' } },
        receiver: {
            type: 'JDBC' as any,
            config: { dataSourceAlias: 'ORDERS_DB', queryTimeout: 30 }
        }
    };
    const flowSingle = fromJson(singleReceiverJson);
    const singleValidation = validate(flowSingle);
    assert(singleValidation.valid, 'flow with JDBC as flow-level receiver validates');
    const singleZip = await compileToZip(flowSingle);
    const singleEntries = printZipTree(singleZip, 'Single JDBC receiver ZIP');
    const singleIflwName = singleEntries.find(e => e.endsWith('.iflw'))!;
    const singleIflw = readZipEntry(singleZip, singleIflwName).toString('utf-8');
    assert(singleIflw.includes('<key>ComponentType</key>') && singleIflw.includes('<value>JDBC</value>'), 'iflw contains JDBC ComponentType');
    assert(singleIflw.includes('ORDERS_DB'), 'iflw contains the configured dataSourceAlias');
    assert(singleIflw.includes('ctype::AdapterVariant/cname::JDBC/vendor::SAP/tp::JDBC/mp::JDBC/direction::Receiver/version::1.5.3'), 'iflw contains the JDBC cmdVariantUri');

    // --- 3. Two mid-flow JdbcCall instances + existing components ---
    console.log('\n[3] Two JdbcCall instances + ContentModifier + GroovyScript');
    const multiJdbcJson: IFlowJson = {
        name: 'Multi JDBC Flow',
        sender: { type: 'HTTPS', config: { address: '/process-order' } },
        components: [
            {
                id: 'setOrderQuery',
                type: 'ContentModifier',
                config: { name: 'Set Order Query', bodyType: 'constant', wrapContent: "SELECT * FROM ORDERS WHERE STATUS = 'NEW'" }
            },
            {
                id: 'queryOrdersDb',
                type: 'JdbcCall' as any,
                config: { name: 'Query Orders DB', dataSourceAlias: 'ORDERS_DB', queryTimeout: 45, maxRecords: 500 }
            },
            {
                id: 'transformOrders',
                type: 'GroovyScript',
                config: { name: 'Transform Orders', scriptName: 'transform.groovy' }
            },
            {
                id: 'setCustomerQuery',
                type: 'ContentModifier',
                config: { name: 'Set Customer Query', bodyType: 'constant', wrapContent: 'SELECT * FROM CUSTOMERS' }
            },
            {
                id: 'queryCustomersDb',
                type: 'JdbcCall' as any,
                config: { name: 'Query Customers DB', dataSourceAlias: 'CUSTOMERS_DB' }
            }
        ],
        connections: [
            { from: 'sender', to: 'setOrderQuery' },
            { from: 'setOrderQuery', to: 'queryOrdersDb' },
            { from: 'queryOrdersDb', to: 'transformOrders' },
            { from: 'transformOrders', to: 'setCustomerQuery' },
            { from: 'setCustomerQuery', to: 'queryCustomersDb' },
            { from: 'queryCustomersDb', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://s4hana.example.com/orders', method: 'POST' } },
        resources: [
            { type: 'groovy', name: 'transform.groovy', content: 'Message processData(Message message) { return message }' }
        ]
    };

    const multiFlow = fromJson(multiJdbcJson);
    const jdbcComponents = multiFlow.getComponents().filter(c => c.componentType === 'JdbcCall');
    assert(jdbcComponents.length === 2, 'flow has 2 JdbcCall components');
    const jdbcIds = jdbcComponents.map(c => c.id);
    assert(new Set(jdbcIds).size === 2, 'the 2 JdbcCall components have unique IDs');
    assert(jdbcIds.includes('queryOrdersDb') && jdbcIds.includes('queryCustomersDb'), 'AI-provided logical IDs are preserved');

    const multiValidation = validate(multiFlow);
    console.log('  Validation result:', JSON.stringify(multiValidation));
    assert(multiValidation.valid, 'multi-JDBC flow validates (valid === true)');
    const duplicateIdErrors = multiValidation.errors.filter(e => e.code === 'CP-001');
    assert(duplicateIdErrors.length === 0, 'no CP-001 duplicate ID errors across 2 JdbcCall instances');

    const multiZip = await compileToZip(multiFlow);
    assert(multiZip.length > 0, 'ZIP buffer generated for multi-JDBC flow');
    const multiEntries = printZipTree(multiZip, 'Multi JDBC flow ZIP');
    const multiIflwName = multiEntries.find(e => e.endsWith('.iflw'))!;
    const multiIflw = readZipEntry(multiZip, multiIflwName).toString('utf-8');

    // Two distinct serviceTask elements (one per JdbcCall)
    const serviceTaskMatches = multiIflw.match(/<bpmn2:serviceTask id="[^"]+"/g) || [];
    assert(serviceTaskMatches.length === 2, `iflw contains 2 <serviceTask> elements (found ${serviceTaskMatches.length})`);
    const serviceTaskIds = serviceTaskMatches.map(m => m.match(/id="([^"]+)"/)![1]);
    assert(new Set(serviceTaskIds).size === 2, 'the 2 serviceTask ids are unique');
    assert(serviceTaskIds.includes('queryOrdersDb') && serviceTaskIds.includes('queryCustomersDb'), 'serviceTask ids match the JdbcCall component ids');

    // Two distinct JDBC messageFlows with unique ids, each targeting a unique participant.
    // Channel names are deduped ("JDBC", "JDBC_2", ...) rather than required to
    // literally read "JDBC" -- match on ComponentType=JDBC in the body instead
    // of the channel name attribute.
    const jdbcMessageFlowMatches = [...multiIflw.matchAll(/<bpmn2:messageFlow id="([^"]+)" name="([^"]+)" sourceRef="([^"]+)" targetRef="([^"]+)">([\s\S]*?)<\/bpmn2:messageFlow>/g)]
        .filter(m => /<key>ComponentType<\/key>\s*<value>JDBC<\/value>/.test(m[5]));
    assert(jdbcMessageFlowMatches.length === 2, `iflw contains 2 JDBC messageFlow elements (found ${jdbcMessageFlowMatches.length})`);
    const mfIds = jdbcMessageFlowMatches.map(m => m[1]);
    const channelNames = jdbcMessageFlowMatches.map(m => m[2]);
    const participantTargets = jdbcMessageFlowMatches.map(m => m[4]);
    assert(new Set(mfIds).size === 2, 'the 2 JDBC messageFlow ids are unique');
    assert(new Set(channelNames).size === 2, 'the 2 JDBC channel names are unique (deduped, e.g. "JDBC" and "JDBC_2")');
    assert(new Set(participantTargets).size === 2, 'the 2 JDBC messageFlows target distinct participants (no shared/duplicated participant id)');

    // Both data source aliases present, resource (groovy script) still packaged
    assert(multiIflw.includes('ORDERS_DB') && multiIflw.includes('CUSTOMERS_DB'), 'iflw contains both configured dataSourceAlias values');
    assert(multiEntries.includes('src/main/resources/script/transform.groovy'), 'ZIP still packages the unrelated groovy resource alongside JDBC (script/transform.groovy)');
    assert(!multiEntries.some(e => e.includes('script/script/') || e.includes('xsd/xsd/')), 'no doubled resource directory prefixes');

    // --- 4. Validation: unsupported property rejected ---
    console.log('\n[4] JDBC config validation');
    let threwOnUnsupported = false;
    try {
        fromJson({
            name: 'Bad JDBC Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [
                { id: 'bad', type: 'JdbcCall' as any, config: { dataSourceAlias: 'X', notARealProperty: 'oops' } }
            ],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
            connections: [{ from: 'sender', to: 'bad' }, { from: 'bad', to: 'receiver' }]
        });
    } catch (err) {
        threwOnUnsupported = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnUnsupported, 'fromJson() throws on an unsupported JDBC property instead of silently accepting it');

    let threwOnMissingAlias = false;
    try {
        fromJson({
            name: 'Missing Alias Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [
                { id: 'bad2', type: 'JdbcCall' as any, config: { name: 'No Alias' } }
            ],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
            connections: [{ from: 'sender', to: 'bad2' }, { from: 'bad2', to: 'receiver' }]
        });
    } catch (err) {
        threwOnMissingAlias = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMissingAlias, 'fromJson() throws when dataSourceAlias is missing');

    let threwOnSenderDirection = false;
    try {
        fromJson({
            name: 'JDBC Sender Flow',
            sender: { type: 'JDBC' as any, config: { dataSourceAlias: 'X' } },
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        threwOnSenderDirection = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnSenderDirection, 'fromJson() throws when JDBC is requested as a Sender (unsupported direction)');

    // --- 5. Existing non-JDBC behavior unaffected ---
    console.log('\n[5] Existing non-JDBC flow (Router) still compiles');
    const routerJson: IFlowJson = {
        name: 'Router Regression Check',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            {
                id: 'router1',
                type: 'Router',
                config: {
                    name: 'Route by Type',
                    routes: [{ condition: "${header.type} == 'A'", target: 'receiver' }],
                    defaultRoute: { target: 'receiver' }
                }
            }
        ],
        connections: [
            { from: 'sender', to: 'router1' },
            { from: 'router1', to: 'receiver' },
            { from: 'router1', to: 'receiver' }
        ],
        receiver: { type: 'HTTP', config: { url: 'https://example.com', method: 'POST' } }
    };
    const routerFlow = fromJson(routerJson);
    const routerValidation = validate(routerFlow);
    assert(routerValidation.valid, 'unrelated Router flow still validates after JDBC changes');
    const routerZip = await compileToZip(routerFlow);
    assert(routerZip.length > 0, 'unrelated Router flow still compiles to a non-empty ZIP');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
