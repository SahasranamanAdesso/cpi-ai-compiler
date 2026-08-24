/**
 * Regression test - Process Direct adapter support
 *
 * Covers the scenarios from the Process Direct extension task:
 *   1. Capability discovery.
 *   2. One Process Direct instance (mid-flow ProcessDirectCall).
 *   3. Two Process Direct instances in the same flow -- no duplicate IDs.
 *   4. Process Direct + ContentModifier.
 *   5. Process Direct + Router (domestic/international routing to two
 *      different ProcessDirectCall targets).
 *   6. Process Direct + ProcessCall (coexistence, no ID collisions).
 *   7. Process Direct + JdbcCall (coexistence, no ID collisions).
 *   8. fromJson() -> validate().
 *   9. compileToZip().
 *  10. Generated .iflw contains the expected Process Direct structure.
 *  11. Invalid Process Direct configuration is rejected (missing address).
 *  12. Unsupported Process Direct properties are rejected.
 *  13. Multiple Process Direct instances do not generate duplicate IDs
 *      (component, participant, AND messageFlow ids).
 *  14. Existing JDBC/ProcessCall/Router regression suites still pass --
 *      verified separately by re-running test-jdbc-regression.ts,
 *      test-jdbc-ai-scenarios-regression.ts, test-naming-version-regression.ts,
 *      test/run-rt-003-tests.ts, test/run-mapping-regression-simple.ts.
 *
 * Also covers ProcessDirect used as a flow-level Sender AND Receiver (not
 * just the mid-flow ProcessDirectCall case) -- real SAP evidence shows both
 * directions genuinely exist for this adapter, unlike JDBC.
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

async function main() {
    console.log('=== Regression: Process Direct adapter support ===\n');

    // ------------------------------------------------------------------
    // [1] Capability discovery
    // ------------------------------------------------------------------
    console.log('[1] getCapabilities() exposes Process Direct');
    const caps = getCapabilities();
    const pdCallCap = caps.components.find(c => c.type === 'ProcessDirectCall');
    const pdSenderCap = caps.adapters.find(a => a.type === 'ProcessDirect' && a.direction === 'Sender');
    const pdReceiverCap = caps.adapters.find(a => a.type === 'ProcessDirect' && a.direction === 'Receiver');
    assert(!!pdCallCap, 'capabilities.components includes ProcessDirectCall');
    assert(!!pdCallCap?.requiredProperties.includes('address'), 'ProcessDirectCall requires address');
    assert(!!pdSenderCap, 'capabilities.adapters includes ProcessDirect Sender (real SAP exports show both directions)');
    assert(!!pdReceiverCap, 'capabilities.adapters includes ProcessDirect Receiver');
    assert(!!pdSenderCap?.requiredProperties.includes('address') && !!pdReceiverCap?.requiredProperties.includes('address'), 'both ProcessDirect directions require address');

    // ------------------------------------------------------------------
    // [2] Flow-level Sender + Receiver via createAdapter (single instance)
    // ------------------------------------------------------------------
    console.log('\n[2] Process Direct as flow-level Sender and Receiver');
    const flowLevelJson: IFlowJson = {
        name: 'Process Direct Flow Level Test',
        sender: { type: 'ProcessDirect' as any, config: { address: '/process/orders' } },
        receiver: { type: 'ProcessDirect' as any, config: { address: '/process/orders-out' } }
    };
    const flowLevelFlow = fromJson(flowLevelJson);
    const flowLevelValidation = validate(flowLevelFlow);
    assert(flowLevelValidation.valid, 'flow with ProcessDirect as both sender and receiver validates');
    const flowLevelZip = await compileToZip(flowLevelFlow);
    const flowLevelEntries = listZipEntries(flowLevelZip);
    const flowLevelIflw = readZipEntry(flowLevelZip, flowLevelEntries.find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert(flowLevelIflw.includes('<value>ProcessDirect</value>'), 'iflw contains ProcessDirect ComponentType');
    assert(flowLevelIflw.includes('direction::Sender/version::1.1.2'), 'sender cmdVariantUri matches evidence (version 1.1.2)');
    assert(flowLevelIflw.includes('direction::Receiver/version::1.1.1'), 'receiver cmdVariantUri matches evidence (version 1.1.1)');
    assert(flowLevelIflw.includes('/process/orders') && flowLevelIflw.includes('/process/orders-out'), 'both configured addresses present');

    // Addresses without a leading "/" are normalized (a "/" is prepended),
    // matching the mid-flow ProcessDirectCall convention exercised in [11]
    // below and HttpAdapter's own sender-address convention -- this is
    // intentional, not a gap, so we assert normalization here rather than
    // a thrown error.
    const normalizedAddrFlow = fromJson({ name: 'x', sender: { type: 'ProcessDirect' as any, config: { address: 'no-leading-slash' } } });
    const normalizedSenderAdapter: any = (normalizedAddrFlow as any).getSender();
    assert(normalizedSenderAdapter.properties.address === '/no-leading-slash', 'flow-level ProcessDirect sender normalizes a missing leading "/" instead of rejecting it');

    // ------------------------------------------------------------------
    // [3] One Process Direct instance, mid-flow, + ContentModifier
    // ------------------------------------------------------------------
    console.log('\n[3] Single mid-flow ProcessDirectCall + ContentModifier');
    const singleJson: IFlowJson = {
        name: 'Single Process Direct Call',
        sender: { type: 'HTTPS', config: { address: '/orders' } },
        components: [
            { id: 'setOrderContext', type: 'ContentModifier', config: { name: 'Set Order Context', bodyType: 'expression' } },
            { id: 'callOrderFlow', type: 'ProcessDirectCall' as any, config: { name: 'Call Order Processing Flow', address: '/process/orders' } }
        ],
        connections: [
            { from: 'sender', to: 'setOrderContext' },
            { from: 'setOrderContext', to: 'callOrderFlow' },
            { from: 'callOrderFlow', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com/orders', method: 'POST' } }
    };
    const singleFlow = fromJson(singleJson);
    const singleValidation = validate(singleFlow);
    console.log('  validate():', JSON.stringify(singleValidation));
    assert(singleValidation.valid, 'single ProcessDirectCall flow validates');
    assert(singleValidation.errors.length === 0, 'no validation errors');

    const singleZip = await compileToZip(singleFlow);
    const singleEntries = printZipTree(singleZip, 'Single ProcessDirectCall ZIP');
    const singleIflwName = singleEntries.find(e => e.endsWith('.iflw'))!;
    const singleIflw = readZipEntry(singleZip, singleIflwName).toString('utf-8');

    // [10] Generated .iflw structural checks
    assert(/<bpmn2:serviceTask id="callOrderFlow"[\s\S]*?<value>ExternalCall<\/value>/.test(singleIflw), 'serviceTask for ProcessDirectCall has activityType=ExternalCall');
    assert(singleIflw.includes('ctype::FlowstepVariant/cname::ExternalCall/version::1.0.4'), 'serviceTask cmdVariantUri matches ExternalCall evidence');
    const pdMessageFlowMatch = singleIflw.match(/<bpmn2:messageFlow id="([^"]+)" name="([^"]+)" sourceRef="callOrderFlow" targetRef="([^"]+)">([\s\S]*?)<\/bpmn2:messageFlow>/);
    assert(!!pdMessageFlowMatch, 'iflw contains a ProcessDirect messageFlow sourced from callOrderFlow');
    if (pdMessageFlowMatch) {
        const body = pdMessageFlowMatch[4];
        assert(body.includes('<key>ComponentType</key>') && body.includes('<value>ProcessDirect</value>'), 'messageFlow has ComponentType=ProcessDirect');
        assert(body.includes('<key>address</key>') && body.includes('<value>/process/orders</value>'), 'messageFlow carries the configured address');
        assert(body.includes('<key>Vendor</key>') && body.includes('<value>SAP</value>'), 'messageFlow carries Vendor=SAP');
        assert(body.includes('direction::Receiver/version::1.1.1'), 'messageFlow cmdVariantUri matches Receiver evidence (version 1.1.1)');
        const participantId = pdMessageFlowMatch[3];
        assert(singleIflw.includes(`<bpmn2:participant id="${participantId}" ifl:type="EndpointRecevier"`), `messageFlow targets an EndpointRecevier participant (${participantId})`);
        assert(isValidNCName(pdMessageFlowMatch[2]), `channel name "${pdMessageFlowMatch[2]}" is a valid XML NCName`);
    }

    // ------------------------------------------------------------------
    // [4/13] Two Process Direct instances -- no duplicate IDs anywhere
    // ------------------------------------------------------------------
    console.log('\n[4] Two ProcessDirectCall instances in the same flow');
    const twoJson: IFlowJson = {
        name: 'Two Process Direct Calls',
        sender: { type: 'HTTPS', config: { address: '/invoices' } },
        components: [
            { id: 'pdDomestic', type: 'ProcessDirectCall' as any, config: { name: 'Call Domestic Flow', address: '/process/domestic-invoices' } },
            { id: 'pdInternational', type: 'ProcessDirectCall' as any, config: { name: 'Call International Flow', address: '/process/international-invoices' } }
        ],
        connections: [
            { from: 'sender', to: 'pdDomestic' },
            { from: 'pdDomestic', to: 'pdInternational' },
            { from: 'pdInternational', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com/invoices', method: 'POST' } }
    };
    const twoFlow = fromJson(twoJson);
    const twoComponents = twoFlow.getComponents().filter(c => c.componentType === 'ProcessDirectCall');
    assert(twoComponents.length === 2, 'flow has 2 ProcessDirectCall components');
    assert(new Set(twoComponents.map(c => c.id)).size === 2, 'the 2 ProcessDirectCall components have unique ids');
    assert(twoComponents.map(c => c.id).includes('pdDomestic') && twoComponents.map(c => c.id).includes('pdInternational'), 'AI-provided logical ids preserved');

    const twoValidation = validate(twoFlow);
    assert(twoValidation.valid, 'two-ProcessDirectCall flow validates');
    assert(twoValidation.errors.filter(e => e.code === 'CP-001').length === 0, 'no CP-001 duplicate ID errors');

    const twoZip = await compileToZip(twoFlow);
    const twoEntries = listZipEntries(twoZip);
    const twoIflw = readZipEntry(twoZip, twoEntries.find(e => e.endsWith('.iflw'))!).toString('utf-8');

    const serviceTaskIds = [...twoIflw.matchAll(/<bpmn2:serviceTask id="([^"]+)"/g)].map(m => m[1]);
    assert(serviceTaskIds.length === 2 && new Set(serviceTaskIds).size === 2, `2 unique serviceTask ids (found ${serviceTaskIds.length})`);

    const pdMessageFlows = [...twoIflw.matchAll(/<bpmn2:messageFlow id="([^"]+)" name="([^"]+)" sourceRef="([^"]+)" targetRef="([^"]+)">([\s\S]*?)<\/bpmn2:messageFlow>/g)]
        .filter(m => /<key>ComponentType<\/key>\s*<value>ProcessDirect<\/value>/.test(m[5]));
    assert(pdMessageFlows.length === 2, `2 ProcessDirect messageFlows (found ${pdMessageFlows.length})`);
    const pdMfIds = pdMessageFlows.map(m => m[1]);
    const pdChannelNames = pdMessageFlows.map(m => m[2]);
    const pdParticipantTargets = pdMessageFlows.map(m => m[4]);
    assert(new Set(pdMfIds).size === 2, 'the 2 ProcessDirect messageFlow ids are unique');
    assert(new Set(pdChannelNames).size === 2, `the 2 ProcessDirect channel names are unique (deduped): ${JSON.stringify(pdChannelNames)}`);
    assert(new Set(pdParticipantTargets).size === 2, 'the 2 ProcessDirect messageFlows target distinct participants');
    assert(pdMfIds.every(id => id.includes('ProcessDirect')), 'ProcessDirect messageFlow ids use the distinct "ProcessDirect" id prefix');

    const allElementIds = [...twoIflw.matchAll(/<bpmn2:(?:callActivity|serviceTask|startEvent|endEvent|participant|messageFlow) id="([^"]+)"/g)].map(m => m[1]);
    assert(new Set(allElementIds).size === allElementIds.length, `all ${allElementIds.length} BPMN element ids in the flow are unique`);

    // ------------------------------------------------------------------
    // [5] Process Direct + Router (domestic/international routing)
    // ------------------------------------------------------------------
    console.log('\n[5] Router routes to two different ProcessDirectCall targets');
    const routerJson: IFlowJson = {
        name: 'Route Orders to Domestic or International Process Direct',
        sender: { type: 'HTTPS', config: { address: '/orders/receive' } },
        components: [
            {
                id: 'classifyOrder',
                type: 'Router',
                config: {
                    name: 'Check Domestic or International',
                    routes: [{ condition: "${header.country} == 'US'", target: 'pdDomestic2' }],
                    defaultRoute: { target: 'pdInternational2' }
                }
            },
            { id: 'pdDomestic2', type: 'ProcessDirectCall' as any, config: { name: 'Call Domestic Order Flow', address: '/process/domestic-orders' } },
            { id: 'pdInternational2', type: 'ProcessDirectCall' as any, config: { name: 'Call International Order Flow', address: '/process/international-orders' } }
        ],
        connections: [
            { from: 'sender', to: 'classifyOrder' },
            { from: 'classifyOrder', to: 'pdDomestic2' },
            { from: 'classifyOrder', to: 'pdInternational2' },
            { from: 'pdDomestic2', to: 'receiver' },
            { from: 'pdInternational2', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com/orders', method: 'POST' } }
    };
    const routerFlow = fromJson(routerJson);
    const routerValidation = validate(routerFlow);
    console.log('  validate():', JSON.stringify(routerValidation));
    assert(routerValidation.valid, 'Router + 2 ProcessDirectCall targets flow validates');
    const routerZip = await compileToZip(routerFlow);
    assert(routerZip.length > 0, 'Router + ProcessDirect flow compiles to a non-empty ZIP');
    const routerIflw = readZipEntry(routerZip, listZipEntries(routerZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert(routerIflw.includes('<bpmn2:exclusiveGateway'), 'Router present as exclusiveGateway');
    assert((routerIflw.match(/<bpmn2:serviceTask/g) || []).length === 2, 'both ProcessDirectCall serviceTasks present');

    // ------------------------------------------------------------------
    // [6] Process Direct + ProcessCall coexistence (no ID collisions)
    // ------------------------------------------------------------------
    console.log('\n[6] Process Direct + ProcessCall coexistence');
    const withProcessCallJson: IFlowJson = {
        name: 'Process Direct and ProcessCall Together',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            { id: 'localSubprocess', type: 'ProcessCall', config: { name: 'Local Enrichment', processId: 'enrichmentSubProcess' } },
            { id: 'remoteFlowCall', type: 'ProcessDirectCall' as any, config: { name: 'Call Remote Flow', address: '/process/remote' } }
        ],
        connections: [
            { from: 'sender', to: 'localSubprocess' },
            { from: 'localSubprocess', to: 'remoteFlowCall' },
            { from: 'remoteFlowCall', to: 'receiver' }
        ],
        // A ProcessCall's processId must resolve to a declared subProcess --
        // this is the Local Integration Process fix under test here too.
        subProcesses: [
            {
                id: 'enrichmentSubProcess',
                name: 'Local Enrichment Subprocess',
                components: [
                    { id: 'enrichStep', type: 'ContentModifier', config: { name: 'Enrich', bodyType: 'constant', wrapContent: 'enriched' } }
                ]
            }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const withProcessCallFlow = fromJson(withProcessCallJson);
    const withProcessCallValidation = validate(withProcessCallFlow);
    console.log('  validate():', JSON.stringify(withProcessCallValidation));
    assert(withProcessCallValidation.valid, 'ProcessCall + ProcessDirectCall flow validates');
    assert(withProcessCallValidation.errors.filter(e => e.code === 'CP-001').length === 0, 'no CP-001 errors between ProcessCall and ProcessDirectCall');
    assert(withProcessCallValidation.errors.filter(e => e.code === 'PC-001').length === 0, 'ProcessCall resolves correctly to its declared Local Integration Process (no PC-001)');
    const withProcessCallZip = await compileToZip(withProcessCallFlow);
    assert(withProcessCallZip.length > 0, 'ProcessCall + ProcessDirectCall flow compiles');
    const withProcessCallIflw = readZipEntry(withProcessCallZip, listZipEntries(withProcessCallZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert(/<bpmn2:process id="[^"]+" name="Local Enrichment Subprocess">/.test(withProcessCallIflw), 'a sibling <bpmn2:process> for the Local Integration Process exists in the generated .iflw');
    const processCallMatch = withProcessCallIflw.match(/<bpmn2:callActivity id="localSubprocess"[\s\S]*?<key>processId<\/key>\s*<value>([^<]+)<\/value>/);
    assert(!!processCallMatch, 'ProcessCall callActivity carries a processId property');
    if (processCallMatch) {
        const referencedProcessId = processCallMatch[1];
        assert(new RegExp(`<bpmn2:process id="${referencedProcessId}" name="Local Enrichment Subprocess">`).test(withProcessCallIflw), `ProcessCall's processId ("${referencedProcessId}") matches an actual <bpmn2:process> id in the .iflw -- this is the exact SAP check behind "The assigned Local Integration Process does not exist"`);
    }

    // ------------------------------------------------------------------
    // [7] Process Direct + JdbcCall coexistence (no ID collisions)
    // ------------------------------------------------------------------
    console.log('\n[7] Process Direct + JdbcCall coexistence');
    const withJdbcJson: IFlowJson = {
        name: 'Process Direct and JdbcCall Together',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            { id: 'setQuery', type: 'ContentModifier', config: { name: 'Set Query', bodyType: 'constant', wrapContent: 'SELECT 1' } },
            { id: 'lookupDb', type: 'JdbcCall', config: { name: 'Lookup DB', dataSourceAlias: 'DB1' } },
            { id: 'callOtherFlow', type: 'ProcessDirectCall' as any, config: { name: 'Call Other Flow', address: '/process/other' } }
        ],
        connections: [
            { from: 'sender', to: 'setQuery' },
            { from: 'setQuery', to: 'lookupDb' },
            { from: 'lookupDb', to: 'callOtherFlow' },
            { from: 'callOtherFlow', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const withJdbcFlow = fromJson(withJdbcJson);
    const withJdbcValidation = validate(withJdbcFlow);
    assert(withJdbcValidation.valid, 'JdbcCall + ProcessDirectCall flow validates');
    assert(withJdbcValidation.errors.filter(e => e.code === 'CP-001').length === 0, 'no CP-001 errors between JdbcCall and ProcessDirectCall');
    const withJdbcZip = await compileToZip(withJdbcFlow);
    const withJdbcIflw = readZipEntry(withJdbcZip, listZipEntries(withJdbcZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    const jdbcMf = [...withJdbcIflw.matchAll(/<bpmn2:messageFlow id="([^"]+)"[^>]*>([\s\S]*?)<\/bpmn2:messageFlow>/g)]
        .filter(m => /<value>JDBC<\/value>/.test(m[2])).map(m => m[1]);
    const pdMf = [...withJdbcIflw.matchAll(/<bpmn2:messageFlow id="([^"]+)"[^>]*>([\s\S]*?)<\/bpmn2:messageFlow>/g)]
        .filter(m => /<value>ProcessDirect<\/value>/.test(m[2])).map(m => m[1]);
    assert(jdbcMf.length === 1 && pdMf.length === 1, `exactly one JDBC and one ProcessDirect messageFlow present (found ${jdbcMf.length} JDBC, ${pdMf.length} ProcessDirect)`);
    assert(new Set([...jdbcMf, ...pdMf]).size === 2, 'JDBC and ProcessDirect messageFlow ids do not collide with each other');

    // ------------------------------------------------------------------
    // [13] Multiple ProcessCall AND multiple ProcessDirectCall together --
    // explicit stress test for duplicate-ID safety across BOTH mid-flow
    // adapter-call types at once (the task's specific emphasis, given the
    // prior CP-001 duplicate-ID history with ProcessCall).
    // ------------------------------------------------------------------
    console.log('\n[13] Multiple ProcessCall AND multiple ProcessDirectCall together (duplicate-ID stress test)');
    const stressJson: IFlowJson = {
        name: 'Multi ProcessCall and Multi ProcessDirect',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            { id: 'pc1', type: 'ProcessCall', config: { name: 'Sub Process 1', processId: 'subProcess1' } },
            { id: 'pd1', type: 'ProcessDirectCall' as any, config: { name: 'Call Flow 1', address: '/process/flow1' } },
            { id: 'pc2', type: 'ProcessCall', config: { name: 'Sub Process 2', processId: 'subProcess2' } },
            { id: 'pd2', type: 'ProcessDirectCall' as any, config: { name: 'Call Flow 2', address: '/process/flow2' } },
            { id: 'pc3', type: 'ProcessCall', config: { name: 'Sub Process 3', processId: 'subProcess3' } }
        ],
        connections: [
            { from: 'sender', to: 'pc1' },
            { from: 'pc1', to: 'pd1' },
            { from: 'pd1', to: 'pc2' },
            { from: 'pc2', to: 'pd2' },
            { from: 'pd2', to: 'pc3' },
            { from: 'pc3', to: 'receiver' }
        ],
        // Three distinct Local Integration Processes, one per ProcessCall --
        // also exercises duplicate-ID safety for LocalIntegrationProcess
        // ids themselves (3 subProcesses in one flow).
        subProcesses: [
            { id: 'subProcess1', name: 'Subprocess One', components: [{ id: 'sp1Step', type: 'ContentModifier', config: { name: 'Step', bodyType: 'constant', wrapContent: 'x' } }] },
            { id: 'subProcess2', name: 'Subprocess Two', components: [{ id: 'sp2Step', type: 'ContentModifier', config: { name: 'Step', bodyType: 'constant', wrapContent: 'y' } }] },
            { id: 'subProcess3', name: 'Subprocess Three', components: [{ id: 'sp3Step', type: 'ContentModifier', config: { name: 'Step', bodyType: 'constant', wrapContent: 'z' } }] }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const stressFlow = fromJson(stressJson);
    const stressIds = stressFlow.getComponents().map(c => c.id);
    assert(new Set(stressIds).size === stressIds.length, 'all 5 component ids (3 ProcessCall + 2 ProcessDirectCall) are unique');
    const stressSubProcessIds = stressFlow.getSubProcesses().map(sp => sp.id);
    assert(new Set(stressSubProcessIds).size === 3, 'all 3 Local Integration Process ids are unique');
    const stressValidation = validate(stressFlow);
    console.log('  validate():', JSON.stringify(stressValidation));
    assert(stressValidation.valid, 'mixed ProcessCall/ProcessDirectCall flow validates');
    assert(stressValidation.errors.filter(e => e.code === 'CP-001').length === 0, 'no CP-001 duplicate ID errors across mixed ProcessCall/ProcessDirectCall');
    assert(stressValidation.errors.filter(e => e.code === 'PC-001').length === 0, 'all 3 ProcessCalls resolve correctly to their declared Local Integration Processes (no PC-001)');
    assert(stressValidation.errors.filter(e => e.code === 'LIP-002').length === 0, 'no duplicate Local Integration Process ids (no LIP-002)');
    const stressZip = await compileToZip(stressFlow);
    const stressIflw = readZipEntry(stressZip, listZipEntries(stressZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    const stressAllIds = [...stressIflw.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    const stressDupes = stressAllIds.filter((id, i) => stressAllIds.indexOf(id) !== i);
    assert(stressDupes.length === 0, `zero duplicate XML element ids across ${stressAllIds.length} total ids in mixed flow`);
    assert((stressIflw.match(/<bpmn2:messageFlow/g) || []).length === 4, '4 messageFlows present (2 HTTPS sender/receiver + 2 ProcessDirect)');

    // ------------------------------------------------------------------
    // [11] Invalid configuration rejected
    // ------------------------------------------------------------------
    console.log('\n[11] Invalid Process Direct configuration is rejected');
    let threwOnMissingAddress = false;
    try {
        fromJson({
            name: 'Missing Address Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'bad', type: 'ProcessDirectCall' as any, config: { name: 'No Address' } }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
            connections: [{ from: 'sender', to: 'bad' }, { from: 'bad', to: 'receiver' }]
        });
    } catch (err) {
        threwOnMissingAddress = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMissingAddress, 'fromJson() throws when address is missing');

    let threwOnBadAddress = false;
    try {
        fromJson({
            name: 'Bad Address Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'bad2', type: 'ProcessDirectCall' as any, config: { address: 'process/no-leading-slash' } }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
            connections: [{ from: 'sender', to: 'bad2' }, { from: 'bad2', to: 'receiver' }]
        });
    } catch (err) {
        threwOnBadAddress = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    // Note: addresses without a leading "/" are auto-normalized (a "/" is
    // prepended), matching HttpAdapter's sender address convention -- so
    // this specific case does NOT throw. Documented here to make that
    // explicit rather than silently assuming rejection.
    console.log(`  (Address without leading "/" is normalized, not rejected -- threw: ${threwOnBadAddress})`);

    // ------------------------------------------------------------------
    // [12] Unsupported properties rejected
    // ------------------------------------------------------------------
    console.log('\n[12] Unsupported Process Direct properties are rejected');
    let threwOnUnsupported = false;
    try {
        fromJson({
            name: 'Unsupported Property Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'bad3', type: 'ProcessDirectCall' as any, config: { address: '/process/x', timeout: 5000 } }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } },
            connections: [{ from: 'sender', to: 'bad3' }, { from: 'bad3', to: 'receiver' }]
        });
    } catch (err) {
        threwOnUnsupported = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnUnsupported, 'fromJson() throws on an unsupported Process Direct property (e.g. "timeout") instead of silently accepting it');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
