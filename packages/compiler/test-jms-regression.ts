/**
 * Regression test - JMS Sender/Receiver adapter support
 *
 * Evidence source: jms_reference.zip, "Common Flow - Receive IDoc from SAP
 * S4HANA.iflw". Confirms JMS is a flow-level adapter supporting BOTH
 * directions (unlike JDBC/RFC, which are Receiver-only), with NO mid-flow
 * BPMN representation at all (unlike JDBC/Process Direct, which do have a
 * mid-flow call component):
 *
 *   Sender messageFlow "MessageFlow_39953" (sourceRef=Participant_39951
 *   "S4_JMS", targetRef=StartEvent_39952 -- Participant -> StartEvent, the
 *   same shape as every other flow-level sender):
 *     ComponentType=JMS, ComponentNS=sap, componentVersion=1.3,
 *     TransportProtocol=Not Applicable, MessageProtocol=Not Applicable,
 *     TransportProtocolVersion=1.5.0, MessageProtocolVersion=1.5.0,
 *     ComponentSWCVId=1.5.0, direction=Sender, system=S4_JMS,
 *     QueueName_inbound={{JMS_Queue}}, NumberConcurrentProcesses=1,
 *     MaxRetryInterval=60, useDeadLetterQueue=1, ExponentialBackoff=1,
 *     RetryInterval=1
 *   cmdVariantUri=ctype::AdapterVariant/cname::sap:JMS/tp::Not Applicable/mp::Not Applicable/direction::Sender/version::1.3.0
 *
 *   Receiver messageFlow "MessageFlow_39957" (sourceRef=EndEvent_2,
 *   targetRef=Participant_2 "S4_JMS" -- EndEvent -> Participant, the same
 *   shape as every other flow-level receiver):
 *     ComponentType=JMS, ComponentNS=sap, componentVersion=1.5,
 *     TransportProtocol=Not Applicable, MessageProtocol=Not Applicable,
 *     TransportProtocolVersion=1.5.0, MessageProtocolVersion=1.5.0,
 *     ComponentSWCVId=1.5.0, direction=Receiver, system=S4_JMS,
 *     QueueName_outbound={{JMS_Queue}}, UseMessageCompression=1,
 *     EncryptMessage=1, RetentionThresholdAlerting=2, ExpirationPeriod=30,
 *     TransferExchangeProperties=1
 *   cmdVariantUri=ctype::AdapterVariant/cname::sap:JMS/tp::Not Applicable/mp::Not Applicable/direction::Receiver/version::1.5.0
 *
 * parameters.propdef confirms the queue name is the only meaningfully
 * externalized JMS property (parameter key "JMS_Queue", UI label
 * "Queue Name"), shared by both QueueName_inbound and QueueName_outbound --
 * unified here as a single `queueName` config property per direction.
 *
 * Note: several JMS boolean properties are confirmed to serialize as the
 * literal strings "1"/"0" (NOT "true"/"false" like every other adapter in
 * this compiler) -- preserved exactly as evidenced.
 *
 * Covers:
 *   1. Capability discovery (both Sender and Receiver).
 *   2. HTTPS -> JMS Receiver (the primary requested scenario).
 *   3. JMS Sender -> HTTPS Receiver.
 *   4. JMS Sender + JMS Receiver in the same flow (both directions, one flow).
 *   5. JMS + ContentModifier.
 *   6. fromJson() -> validate() -> compileToZip() for each.
 *   7. Generated .iflw contains the expected JMS adapter structure.
 *   8. Sequence-flow correctness (no orphan Start/End -- see commit 6's fix).
 *   9. Invalid JMS configuration rejected (missing queueName, both directions).
 *  10. Unsupported JMS properties rejected (both directions).
 *  11. JMS declared as a components[] entry is rejected with an actionable
 *      error (not the generic "Unsupported component type").
 *  12. No duplicate IDs when combined with other adapters/components.
 */

import { fromJson, validate, compileToZip, getCapabilities, createComponent, IFlowJson } from './src/index';
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

function extractSequenceFlowEdges(iflw: string): Array<{ sourceRef: string; targetRef: string }> {
    const edges: Array<{ sourceRef: string; targetRef: string }> = [];
    const regex = /<bpmn2:sequenceFlow id="[^"]+"[^>]*?sourceRef="([^"]+)"\s+targetRef="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(iflw)) !== null) {
        edges.push({ sourceRef: match[1], targetRef: match[2] });
    }
    return edges;
}

function isEndReachableFromStart(edges: Array<{ sourceRef: string; targetRef: string }>): boolean {
    const adjacency = new Map<string, string[]>();
    edges.forEach(e => {
        if (!adjacency.has(e.sourceRef)) adjacency.set(e.sourceRef, []);
        adjacency.get(e.sourceRef)!.push(e.targetRef);
    });
    const visited = new Set<string>();
    const stack = ['StartEvent_2'];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (visited.has(node)) continue;
        visited.add(node);
        if (node === 'EndEvent_2') return true;
        (adjacency.get(node) || []).forEach(next => stack.push(next));
    }
    return false;
}

function assertNoOrphanStartEnd(iflw: string, label: string): void {
    const edges = extractSequenceFlowEdges(iflw);
    assert(edges.some(e => e.sourceRef === 'StartEvent_2'), `${label}: StartEvent_2 has an outgoing sequence flow (no orphan Start)`);
    assert(edges.some(e => e.targetRef === 'EndEvent_2'), `${label}: EndEvent_2 has an incoming sequence flow (no orphan End)`);
    assert(isEndReachableFromStart(edges), `${label}: EndEvent_2 is reachable from StartEvent_2`);
}

async function main() {
    console.log('=== Regression: JMS Sender/Receiver adapter support ===\n');

    // ------------------------------------------------------------------
    // [1] Capability discovery
    // ------------------------------------------------------------------
    console.log('[1] getCapabilities() exposes JMS');
    const caps = getCapabilities();
    const jmsSenderCap = caps.adapters.find(a => a.type === 'JMS' && a.direction === 'Sender');
    const jmsReceiverCap = caps.adapters.find(a => a.type === 'JMS' && a.direction === 'Receiver');
    assert(!!jmsSenderCap, 'capabilities.adapters includes JMS Sender');
    assert(!!jmsReceiverCap, 'capabilities.adapters includes JMS Receiver');
    assert(!!jmsSenderCap?.requiredProperties.includes('queueName'), 'JMS Sender requires queueName');
    assert(!!jmsReceiverCap?.requiredProperties.includes('queueName'), 'JMS Receiver requires queueName');
    assert(!caps.components.some(c => c.type === 'JMS'), 'JMS does NOT appear in capabilities.components (not a real component)');

    // ------------------------------------------------------------------
    // [2] HTTPS -> JMS Receiver (the primary requested scenario)
    // ------------------------------------------------------------------
    console.log('\n[2] HTTPS -> JMS Receiver');
    const httpsToJmsJson: IFlowJson = {
        name: 'Order to JMS Queue',
        sender: { type: 'HTTPS', config: { address: '/orders' } },
        receiver: { type: 'JMS' as any, config: { queueName: 'OrderQueue', system: 'S4_JMS' } }
    };
    const httpsToJmsFlow = fromJson(httpsToJmsJson);
    const httpsToJmsValidation = validate(httpsToJmsFlow);
    console.log('  validate():', JSON.stringify(httpsToJmsValidation));
    assert(httpsToJmsValidation.valid, 'HTTPS -> JMS Receiver flow validates');
    const httpsToJmsZip = await compileToZip(httpsToJmsFlow);
    assert(httpsToJmsZip.length > 0, 'compileToZip() produces a non-empty ZIP');
    const httpsToJmsEntries = listZipEntries(httpsToJmsZip);
    const httpsToJmsIflwName = httpsToJmsEntries.find(e => e.endsWith('.iflw'));
    assert(!!httpsToJmsIflwName, 'generated .iflw exists in the ZIP');
    const httpsToJmsIflw = readZipEntry(httpsToJmsZip, httpsToJmsIflwName!).toString('utf-8');

    const jmsReceiverMf = httpsToJmsIflw.match(/<bpmn2:messageFlow[^>]*sourceRef="EndEvent_2"[\s\S]*?<\/bpmn2:messageFlow>/);
    assert(!!jmsReceiverMf, 'iflw contains a flow-level JMS messageFlow (EndEvent_2 -> Participant_2)');
    if (jmsReceiverMf) {
        const body = jmsReceiverMf[0];
        assert(/<key>ComponentType<\/key>\s*<value>JMS<\/value>/.test(body), 'ComponentType=JMS');
        assert(/<key>ComponentNS<\/key>\s*<value>sap<\/value>/.test(body), 'ComponentNS=sap');
        assert(/<key>TransportProtocol<\/key>\s*<value>Not Applicable<\/value>/.test(body), 'TransportProtocol=Not Applicable');
        assert(/<key>MessageProtocol<\/key>\s*<value>Not Applicable<\/value>/.test(body), 'MessageProtocol=Not Applicable');
        assert(/<key>componentVersion<\/key>\s*<value>1\.5<\/value>/.test(body), 'Receiver componentVersion=1.5 (matches evidence)');
        assert(/<key>QueueName_outbound<\/key>\s*<value>OrderQueue<\/value>/.test(body), 'QueueName_outbound carries the configured queue name');
        assert(/<key>system<\/key>\s*<value>S4_JMS<\/value>/.test(body), 'system carries the configured system name');
        assert(/<key>direction<\/key>\s*<value>Receiver<\/value>/.test(body), 'direction=Receiver');
        assert(body.includes('ctype::AdapterVariant/cname::sap:JMS/tp::Not Applicable/mp::Not Applicable/direction::Receiver/version::1.5.0'), 'cmdVariantUri matches evidence exactly');
        assert(/<key>UseMessageCompression<\/key>\s*<value>1<\/value>/.test(body), 'UseMessageCompression defaults to "1" (evidence: literal "1"/"0", not "true"/"false")');
        assert(/<key>EncryptMessage<\/key>\s*<value>1<\/value>/.test(body), 'EncryptMessage defaults to "1"');
        assert(/<key>RetentionThresholdAlerting<\/key>\s*<value>2<\/value>/.test(body), 'RetentionThresholdAlerting defaults to 2');
        assert(/<key>ExpirationPeriod<\/key>\s*<value>30<\/value>/.test(body), 'ExpirationPeriod defaults to 30');
        assert(/<key>TransferExchangeProperties<\/key>\s*<value>1<\/value>/.test(body), 'TransferExchangeProperties defaults to "1"');
    }
    assertNoOrphanStartEnd(httpsToJmsIflw, 'HTTPS -> JMS Receiver');

    // ------------------------------------------------------------------
    // [3] JMS Sender -> HTTPS Receiver
    // ------------------------------------------------------------------
    console.log('\n[3] JMS Sender -> HTTPS Receiver');
    const jmsToHttpsJson: IFlowJson = {
        name: 'IDoc Queue to Downstream',
        sender: { type: 'JMS' as any, config: { queueName: 'IDocProcessing', system: 'S4_JMS' } },
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com', method: 'POST' } }
    };
    const jmsToHttpsFlow = fromJson(jmsToHttpsJson);
    const jmsToHttpsValidation = validate(jmsToHttpsFlow);
    console.log('  validate():', JSON.stringify(jmsToHttpsValidation));
    assert(jmsToHttpsValidation.valid, 'JMS Sender -> HTTPS Receiver flow validates');
    const jmsToHttpsZip = await compileToZip(jmsToHttpsFlow);
    assert(jmsToHttpsZip.length > 0, 'compileToZip() produces a non-empty ZIP');
    const jmsToHttpsIflw = readZipEntry(jmsToHttpsZip, listZipEntries(jmsToHttpsZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');

    const jmsSenderMf = jmsToHttpsIflw.match(/<bpmn2:messageFlow[^>]*sourceRef="Participant_1"[\s\S]*?<\/bpmn2:messageFlow>/);
    assert(!!jmsSenderMf, 'iflw contains a flow-level JMS messageFlow (Participant_1 -> StartEvent_2)');
    if (jmsSenderMf) {
        const body = jmsSenderMf[0];
        assert(/<key>ComponentType<\/key>\s*<value>JMS<\/value>/.test(body), 'ComponentType=JMS');
        assert(/<key>componentVersion<\/key>\s*<value>1\.3<\/value>/.test(body), 'Sender componentVersion=1.3 (matches evidence, DIFFERENT from Receiver\'s 1.5)');
        assert(/<key>QueueName_inbound<\/key>\s*<value>IDocProcessing<\/value>/.test(body), 'QueueName_inbound carries the configured queue name');
        assert(/<key>direction<\/key>\s*<value>Sender<\/value>/.test(body), 'direction=Sender');
        assert(body.includes('ctype::AdapterVariant/cname::sap:JMS/tp::Not Applicable/mp::Not Applicable/direction::Sender/version::1.3.0'), 'cmdVariantUri matches evidence exactly (Sender version 1.3.0)');
        // Confirmed asymmetry from evidence: TransportProtocolVersion/MessageProtocolVersion/ComponentSWCVId
        // are 1.5.0 for the SENDER too, even though its own componentVersion/cmdVariantUri are 1.3/1.3.0.
        assert(/<key>TransportProtocolVersion<\/key>\s*<value>1\.5\.0<\/value>/.test(body), 'Sender TransportProtocolVersion is 1.5.0 (confirmed asymmetry vs its own componentVersion 1.3)');
        assert(/<key>NumberConcurrentProcesses<\/key>\s*<value>1<\/value>/.test(body), 'NumberConcurrentProcesses defaults to 1');
        assert(/<key>MaxRetryInterval<\/key>\s*<value>60<\/value>/.test(body), 'MaxRetryInterval defaults to 60');
        assert(/<key>useDeadLetterQueue<\/key>\s*<value>1<\/value>/.test(body), 'useDeadLetterQueue defaults to "1"');
        assert(/<key>ExponentialBackoff<\/key>\s*<value>1<\/value>/.test(body), 'ExponentialBackoff defaults to "1"');
        assert(/<key>RetryInterval<\/key>\s*<value>1<\/value>/.test(body), 'RetryInterval defaults to 1');
    }
    assertNoOrphanStartEnd(jmsToHttpsIflw, 'JMS Sender -> HTTPS Receiver');

    // ------------------------------------------------------------------
    // [4] JMS as BOTH sender and receiver in the same flow (matches
    // evidence: jms_reference.zip has both directions in one .iflw)
    // ------------------------------------------------------------------
    console.log('\n[4] JMS Sender + JMS Receiver in the same flow');
    const bothDirectionsJson: IFlowJson = {
        name: 'JMS to JMS',
        sender: { type: 'JMS' as any, config: { queueName: 'InboundQueue', system: 'S4_JMS' } },
        receiver: { type: 'JMS' as any, config: { queueName: 'OutboundQueue', system: 'S4_JMS' } }
    };
    const bothDirectionsFlow = fromJson(bothDirectionsJson);
    const bothDirectionsValidation = validate(bothDirectionsFlow);
    console.log('  validate():', JSON.stringify(bothDirectionsValidation));
    assert(bothDirectionsValidation.valid, 'JMS Sender + JMS Receiver flow validates');
    const bothDirectionsZip = await compileToZip(bothDirectionsFlow);
    const bothDirectionsIflw = readZipEntry(bothDirectionsZip, listZipEntries(bothDirectionsZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert((bothDirectionsIflw.match(/<value>JMS<\/value>/g) || []).length >= 2, 'both JMS messageFlows present in the generated .iflw');
    assertNoOrphanStartEnd(bothDirectionsIflw, 'JMS Sender + JMS Receiver');

    // ------------------------------------------------------------------
    // [5] JMS + ContentModifier
    // ------------------------------------------------------------------
    console.log('\n[5] HTTPS -> ContentModifier -> JMS Receiver');
    const withCmJson: IFlowJson = {
        name: 'Order Transform to JMS',
        sender: { type: 'HTTPS', config: { address: '/orders' } },
        components: [
            { id: 'transform', type: 'ContentModifier', config: { name: 'Transform', bodyType: 'constant', wrapContent: 'x' } }
        ],
        connections: [
            { from: 'sender', to: 'transform' },
            { from: 'transform', to: 'receiver' }
        ],
        receiver: { type: 'JMS' as any, config: { queueName: 'OrderQueue' } }
    };
    const withCmFlow = fromJson(withCmJson);
    const withCmValidation = validate(withCmFlow);
    assert(withCmValidation.valid, 'HTTPS -> ContentModifier -> JMS Receiver flow validates');
    const withCmZip = await compileToZip(withCmFlow);
    assert(withCmZip.length > 0, 'compileToZip() succeeds');
    const withCmIflw = readZipEntry(withCmZip, listZipEntries(withCmZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert(withCmIflw.includes('name="Transform"'), 'ContentModifier step present before JMS receiver');
    assertNoOrphanStartEnd(withCmIflw, 'HTTPS -> ContentModifier -> JMS Receiver');

    // ------------------------------------------------------------------
    // [9] Invalid configuration rejected (missing queueName, both directions)
    // ------------------------------------------------------------------
    console.log('\n[9] Invalid JMS configuration is rejected');
    let threwOnMissingQueueSender = false;
    try {
        fromJson({ name: 'x', sender: { type: 'JMS' as any, config: { system: 'S4_JMS' } }, receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } } });
    } catch (err) {
        threwOnMissingQueueSender = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMissingQueueSender, 'fromJson() throws when JMS Sender queueName is missing');

    let threwOnMissingQueueReceiver = false;
    try {
        fromJson({ name: 'x', sender: { type: 'HTTPS', config: { address: '/x' } }, receiver: { type: 'JMS' as any, config: { system: 'S4_JMS' } } });
    } catch (err) {
        threwOnMissingQueueReceiver = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMissingQueueReceiver, 'fromJson() throws when JMS Receiver queueName is missing');

    // ------------------------------------------------------------------
    // [10] Unsupported properties rejected (both directions)
    // ------------------------------------------------------------------
    console.log('\n[10] Unsupported JMS properties are rejected');
    let threwOnUnsupportedSender = false;
    try {
        fromJson({
            name: 'x',
            sender: { type: 'JMS' as any, config: { queueName: 'Q', connectionFactory: 'ConnectionFactory1' } },
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        threwOnUnsupportedSender = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnUnsupportedSender, 'fromJson() throws on an unsupported JMS Sender property (e.g. invented "connectionFactory") instead of silently accepting it');

    let threwOnUnsupportedReceiver = false;
    try {
        fromJson({
            name: 'x',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            receiver: { type: 'JMS' as any, config: { queueName: 'Q', deliveryMode: 'PERSISTENT' } }
        });
    } catch (err) {
        threwOnUnsupportedReceiver = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnUnsupportedReceiver, 'fromJson() throws on an unsupported JMS Receiver property (e.g. invented "deliveryMode") instead of silently accepting it');

    // ------------------------------------------------------------------
    // [11] JMS declared as a components[] entry is rejected with an
    // actionable error, not the generic "Unsupported component type"
    // ------------------------------------------------------------------
    console.log('\n[11] JMS declared as a components[] entry is rejected with an actionable error');
    let componentError: string | undefined;
    try {
        fromJson({
            name: 'JMS As Component',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'jmsStep', type: 'JMS' as any, config: { queueName: 'Q' } }],
            connections: [{ from: 'sender', to: 'jmsStep' }, { from: 'jmsStep', to: 'receiver' }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        componentError = (err as Error).message;
        console.log(`  Correctly threw: ${componentError}`);
    }
    assert(!!componentError && componentError.includes('flow-level') && !componentError.startsWith('Unsupported component type'), 'fromJson() gives an actionable error, not the generic "Unsupported component type" message');

    let directCallError: string | undefined;
    try {
        createComponent('JMS' as any, { queueName: 'Q' });
    } catch (err) {
        directCallError = (err as Error).message;
        console.log(`  Correctly threw: ${directCallError}`);
    }
    assert(!!directCallError && directCallError.includes('sender') && directCallError.includes('receiver'), 'createComponent(\'JMS\', ...) explains JMS must be a sender or receiver adapter');

    // ------------------------------------------------------------------
    // [12] No duplicate IDs when JMS is combined with other components
    // ------------------------------------------------------------------
    console.log('\n[12] No duplicate IDs when JMS is combined with ProcessCall/JdbcCall');
    const combinedJson: IFlowJson = {
        name: 'JMS With ProcessCall And JdbcCall',
        sender: { type: 'JMS' as any, config: { queueName: 'InboundQueue' } },
        components: [
            { id: 'setQuery', type: 'ContentModifier', config: { name: 'Set Query', bodyType: 'constant', wrapContent: 'SELECT 1' } },
            { id: 'lookupDb', type: 'JdbcCall', config: { name: 'Lookup DB', dataSourceAlias: 'DB1' } },
            { id: 'callProcess', type: 'ProcessCall', config: { name: 'Call Sub Process', processId: 'subProcess' } }
        ],
        connections: [
            { from: 'sender', to: 'setQuery' },
            { from: 'setQuery', to: 'lookupDb' },
            { from: 'lookupDb', to: 'callProcess' },
            { from: 'callProcess', to: 'receiver' }
        ],
        subProcesses: [
            { id: 'subProcess', name: 'Sub Process', components: [{ id: 'subStep', type: 'ContentModifier', config: { name: 'Step', bodyType: 'constant', wrapContent: 'x' } }] }
        ],
        receiver: { type: 'JMS' as any, config: { queueName: 'OutboundQueue' } }
    };
    const combinedFlow = fromJson(combinedJson);
    const combinedValidation = validate(combinedFlow);
    console.log('  validate():', JSON.stringify(combinedValidation));
    assert(combinedValidation.valid, 'JMS + JdbcCall + ProcessCall combined flow validates');
    const combinedZip = await compileToZip(combinedFlow);
    const combinedIflw = readZipEntry(combinedZip, listZipEntries(combinedZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    const allIds = [...combinedIflw.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
    assert(dupes.length === 0, `zero duplicate XML element ids across ${allIds.length} total ids (JMS + JdbcCall + ProcessCall combined)`);
    assertNoOrphanStartEnd(combinedIflw, 'JMS + JdbcCall + ProcessCall combined');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
