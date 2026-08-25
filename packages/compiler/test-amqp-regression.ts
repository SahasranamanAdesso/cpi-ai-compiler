/**
 * Regression test - AMQP Sender adapter support
 *
 * Evidence source: amqp_reference.zip, "Send Outbound Batch Material
 * Replication from S4HANA to D3.iflw", MessageFlow_882
 * (sourceRef="Participant_1" targetRef="StartEvent_2" -- the flow-level
 * sender pattern, same shape as HTTP/JMS/SOAP, NOT a mid-flow serviceTask
 * call). This is SAP Event Mesh's AMQP 1.0 adapter, NOT RabbitMQ-style AMQP
 * 0.9.1 -- confirmed by system=EventMesh, MessageProtocol=AMQP1.0,
 * TransportProtocol=WS, and a unified `destinationName` (no separate
 * exchange/routingKey/virtualHost concept exists anywhere in the export):
 *
 *   ComponentType=AMQP, ComponentNS=sap, TransportProtocol=WS,
 *   MessageProtocol=AMQP1.0, componentVersion=1.7,
 *   TransportProtocolVersion=1.8.0, MessageProtocolVersion=1.8.0,
 *   ComponentSWCVId=1.8.0, direction=Sender, proxyType=none, system=EventMesh
 *   cmdVariantUri=ctype::AdapterVariant/cname::sap:AMQP/tp::WS/mp::AMQP1.0/direction::Sender/version::1.7.0
 *
 * parameters.propdef confirms exactly 13 externalizable properties, all
 * under attribute_category="EventMesh"/"EventMesh.Auth": destinationName,
 * host, port, path, authentication, credentialName, connectWithTLS,
 * disableReplyTo, NumberConcurrentProcesses, maxRetries, queuePrefetch,
 * consumeExpiredMessages, deliveryState. No AMQP Receiver, no mid-flow
 * shape, no RabbitMQ concept (exchange/routingKey/virtualHost/username/
 * password/connectionFactory) is evidenced anywhere in this export.
 *
 * Covers:
 *   1. Capability discovery (Sender only, no Receiver, not a component).
 *   2. AMQP Sender -> HTTPS Receiver (the primary supported scenario).
 *   3. AMQP Sender -> ContentModifier -> HTTPS Receiver.
 *   4. fromJson() -> validate() -> compileToZip() for each.
 *   5. Generated .iflw contains the expected AMQP adapter structure,
 *      checked property-for-property against the reference.
 *   6. Sequence-flow correctness (no orphan Start/End -- commit 6's fix).
 *   7. Invalid AMQP configuration rejected (missing destinationName).
 *   8. Unsupported AMQP properties rejected (including RabbitMQ-style
 *      invented properties: exchange, routingKey, virtualHost, username,
 *      password, connectionFactory, queueName).
 *   9. AMQP Receiver direction rejected (not evidenced).
 *  10. AMQP declared as a components[] entry is rejected with an
 *      actionable error (not the generic "Unsupported component type").
 *  11. No duplicate IDs when combined with other adapters/components.
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
    console.log('=== Regression: AMQP Sender adapter support ===\n');

    // ------------------------------------------------------------------
    // [1] Capability discovery
    // ------------------------------------------------------------------
    console.log('[1] getCapabilities() exposes AMQP');
    const caps = getCapabilities();
    const amqpSenderCap = caps.adapters.find(a => a.type === 'AMQP' && a.direction === 'Sender');
    const amqpReceiverCap = caps.adapters.find(a => a.type === 'AMQP' && a.direction === 'Receiver');
    assert(!!amqpSenderCap, 'capabilities.adapters includes AMQP Sender');
    assert(!amqpReceiverCap, 'capabilities.adapters does NOT include an AMQP Receiver (not evidenced)');
    assert(!!amqpSenderCap?.requiredProperties.includes('destinationName'), 'AMQP Sender requires destinationName');
    assert(!caps.components.some(c => c.type === 'AMQP'), 'AMQP does NOT appear in capabilities.components (not a real component)');

    // ------------------------------------------------------------------
    // [2] AMQP Sender -> HTTPS Receiver (the primary supported scenario)
    // ------------------------------------------------------------------
    console.log('\n[2] AMQP Sender -> HTTPS Receiver');
    const amqpToHttpsJson: IFlowJson = {
        name: 'Batch Material Replication',
        sender: {
            type: 'AMQP' as any,
            config: {
                destinationName: 'queue:sap/s4/EMD/Batch_D3_InitialLoad_Queue',
                system: 'EventMesh',
                host: 'enterprise-messaging-messaging-gateway.cfapps.eu10.hana.ondemand.com',
                port: 443,
                path: '/protocols/amqp10ws',
                authentication: 'Transport_OAuth2',
                credentialName: 'EventMesh_Oauth'
            }
        },
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com', method: 'POST' } }
    };
    const amqpToHttpsFlow = fromJson(amqpToHttpsJson);
    const amqpToHttpsValidation = validate(amqpToHttpsFlow);
    console.log('  validate():', JSON.stringify(amqpToHttpsValidation));
    assert(amqpToHttpsValidation.valid, 'AMQP Sender -> HTTPS Receiver flow validates');
    const amqpToHttpsZip = await compileToZip(amqpToHttpsFlow);
    assert(amqpToHttpsZip.length > 0, 'compileToZip() produces a non-empty ZIP');
    const amqpToHttpsEntries = listZipEntries(amqpToHttpsZip);
    const amqpToHttpsIflwName = amqpToHttpsEntries.find(e => e.endsWith('.iflw'));
    assert(!!amqpToHttpsIflwName, 'generated .iflw exists in the ZIP');
    const amqpToHttpsIflw = readZipEntry(amqpToHttpsZip, amqpToHttpsIflwName!).toString('utf-8');

    const amqpMf = amqpToHttpsIflw.match(/<bpmn2:messageFlow[^>]*sourceRef="Participant_1"[\s\S]*?<\/bpmn2:messageFlow>/);
    assert(!!amqpMf, 'iflw contains a flow-level AMQP messageFlow (Participant_1 -> StartEvent_2)');
    if (amqpMf) {
        const body = amqpMf[0];
        assert(/<key>ComponentType<\/key>\s*<value>AMQP<\/value>/.test(body), 'ComponentType=AMQP');
        assert(/<key>ComponentNS<\/key>\s*<value>sap<\/value>/.test(body), 'ComponentNS=sap');
        assert(/<key>TransportProtocol<\/key>\s*<value>WS<\/value>/.test(body), 'TransportProtocol=WS (matches evidence, NOT a protocol named "AMQP")');
        assert(/<key>MessageProtocol<\/key>\s*<value>AMQP1\.0<\/value>/.test(body), 'MessageProtocol=AMQP1.0');
        assert(/<key>componentVersion<\/key>\s*<value>1\.7<\/value>/.test(body), 'componentVersion=1.7 (matches evidence)');
        assert(/<key>destinationName<\/key>\s*<value>queue:sap\/s4\/EMD\/Batch_D3_InitialLoad_Queue<\/value>/.test(body), 'destinationName carries the configured queue/topic address');
        assert(/<key>host<\/key>\s*<value>enterprise-messaging-messaging-gateway\.cfapps\.eu10\.hana\.ondemand\.com<\/value>/.test(body), 'host carries the configured value');
        assert(/<key>port<\/key>\s*<value>443<\/value>/.test(body), 'port carries the configured value');
        assert(/<key>path<\/key>\s*<value>\/protocols\/amqp10ws<\/value>/.test(body), 'path carries the configured value');
        assert(/<key>authentication<\/key>\s*<value>Transport_OAuth2<\/value>/.test(body), 'authentication carries the configured value');
        assert(/<key>credentialName<\/key>\s*<value>EventMesh_Oauth<\/value>/.test(body), 'credentialName carries the configured value');
        assert(/<key>system<\/key>\s*<value>EventMesh<\/value>/.test(body), 'system carries the configured system name');
        assert(/<key>direction<\/key>\s*<value>Sender<\/value>/.test(body), 'direction=Sender');
        assert(/<key>proxyType<\/key>\s*<value>none<\/value>/.test(body), 'proxyType=none (fixed, matches evidence)');
        assert(/<key>location_id<\/key>\s*<value><\/value>/.test(body), 'location_id is empty (fixed, matches evidence)');
        assert(body.includes('ctype::AdapterVariant/cname::sap:AMQP/tp::WS/mp::AMQP1.0/direction::Sender/version::1.7.0'), 'cmdVariantUri matches evidence exactly (version 1.7.0, distinct from TransportProtocolVersion/MessageProtocolVersion 1.8.0)');
        assert(/<key>TransportProtocolVersion<\/key>\s*<value>1\.8\.0<\/value>/.test(body), 'TransportProtocolVersion=1.8.0 (confirmed asymmetry vs componentVersion 1.7 / cmdVariantUri suffix 1.7.0)');
        assert(/<key>connectWithTLS<\/key>\s*<value>true<\/value>/.test(body), 'connectWithTLS defaults to true');
        assert(/<key>disableReplyTo<\/key>\s*<value>false<\/value>/.test(body), 'disableReplyTo defaults to false');
        assert(/<key>NumberConcurrentProcesses<\/key>\s*<value>1<\/value>/.test(body), 'NumberConcurrentProcesses defaults to 1');
        assert(/<key>maxRetries<\/key>\s*<value>1<\/value>/.test(body), 'maxRetries defaults to 1');
        assert(/<key>queuePrefetch<\/key>\s*<value>5<\/value>/.test(body), 'queuePrefetch defaults to 5');
        assert(/<key>consumeExpiredMessages<\/key>\s*<value>false<\/value>/.test(body), 'consumeExpiredMessages defaults to false');
    }
    assertNoOrphanStartEnd(amqpToHttpsIflw, 'AMQP Sender -> HTTPS Receiver');

    // ------------------------------------------------------------------
    // [3] AMQP Sender -> ContentModifier -> HTTPS Receiver
    // ------------------------------------------------------------------
    console.log('\n[3] AMQP Sender -> ContentModifier -> HTTPS Receiver (using SAP-style externalized-parameter placeholders for host/port/credentialName, since the real Event Mesh infrastructure isn\'t known at generation time)');
    const withCmJson: IFlowJson = {
        name: 'Batch Material With Transform',
        sender: {
            type: 'AMQP' as any,
            config: {
                destinationName: 'queue:sap/s4/EMD/Batch_D3_InitialLoad_Queue',
                host: '{{EMHOST}}',
                port: '{{EMPORT}}',
                credentialName: '{{EMUser}}'
            }
        },
        components: [
            { id: 'transform', type: 'ContentModifier', config: { name: 'Transform', bodyType: 'constant', wrapContent: 'x' } }
        ],
        connections: [
            { from: 'sender', to: 'transform' },
            { from: 'transform', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com', method: 'POST' } }
    };
    const withCmFlow = fromJson(withCmJson);
    const withCmValidation = validate(withCmFlow);
    console.log('  validate():', JSON.stringify(withCmValidation));
    assert(withCmValidation.valid, 'AMQP Sender (placeholder host/port/credentialName) -> ContentModifier -> HTTPS Receiver flow validates');
    const withCmZip = await compileToZip(withCmFlow);
    assert(withCmZip.length > 0, 'compileToZip() succeeds');
    const withCmIflw = readZipEntry(withCmZip, listZipEntries(withCmZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert(withCmIflw.includes('name="Transform"'), 'ContentModifier step present after AMQP sender');
    const withCmAmqpMf = withCmIflw.match(/<bpmn2:messageFlow[^>]*sourceRef="Participant_1"[\s\S]*?<\/bpmn2:messageFlow>/);
    assert(!!withCmAmqpMf && /<key>host<\/key>\s*<value>\{\{EMHOST\}\}<\/value>/.test(withCmAmqpMf[0]), 'host placeholder "{{EMHOST}}" is written through as-is (SAP\'s own externalization convention)');
    assert(!!withCmAmqpMf && /<key>port<\/key>\s*<value>\{\{EMPORT\}\}<\/value>/.test(withCmAmqpMf[0]), 'port placeholder "{{EMPORT}}" is written through as-is, bypassing the numeric range check');
    assert(!!withCmAmqpMf && /<key>credentialName<\/key>\s*<value>\{\{EMUser\}\}<\/value>/.test(withCmAmqpMf[0]), 'credentialName placeholder "{{EMUser}}" is written through as-is');
    assertNoOrphanStartEnd(withCmIflw, 'AMQP Sender -> ContentModifier -> HTTPS Receiver');

    // ------------------------------------------------------------------
    // [7] Invalid configuration rejected
    // ------------------------------------------------------------------
    console.log('\n[7] Invalid AMQP configuration is rejected');
    let threwOnMissingDestination = false;
    try {
        fromJson({ name: 'x', sender: { type: 'AMQP' as any, config: { system: 'EventMesh' } }, receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } } });
    } catch (err) {
        threwOnMissingDestination = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMissingDestination, 'fromJson() throws when destinationName is missing');

    // A fully valid base config, reused below with one field removed/broken
    // at a time -- reproduces the exact reported SAP errors ("Attribute
    // 'Host' is mandatory", "Attribute 'Credential Name' is mandatory",
    // "Enter a value between 1 and 65535") as compiler-side rejections
    // instead of letting them reach compileToZip().
    const validAmqpBase = {
        destinationName: 'queue:sap/s4/EMD/Batch_D3_InitialLoad_Queue',
        host: '{{EMHOST}}',
        port: '{{EMPORT}}',
        credentialName: '{{EMUser}}'
    };

    function tryAmqpConfig(config: Record<string, any>): string | undefined {
        try {
            fromJson({
                name: 'x',
                sender: { type: 'AMQP' as any, config },
                receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
            });
            return undefined;
        } catch (err) {
            return (err as Error).message;
        }
    }

    console.log('\n[7a] Missing Host is rejected');
    const { host: _dropHost, ...withoutHost } = validAmqpBase;
    const missingHostError = tryAmqpConfig(withoutHost);
    console.log(`  Correctly threw: ${missingHostError}`);
    assert(!!missingHostError && missingHostError.includes('Host'), 'fromJson() throws "AMQP configuration requires Host." when host is missing');

    console.log('\n[7b] Missing Credential Name is rejected');
    const { credentialName: _dropCred, ...withoutCred } = validAmqpBase;
    const missingCredError = tryAmqpConfig(withoutCred);
    console.log(`  Correctly threw: ${missingCredError}`);
    assert(!!missingCredError && missingCredError.includes('Credential Name'), 'fromJson() throws "AMQP configuration requires Credential Name." when credentialName is missing');

    console.log('\n[7c] Missing Port is rejected');
    const { port: _dropPort, ...withoutPort } = validAmqpBase;
    const missingPortError = tryAmqpConfig(withoutPort);
    console.log(`  Correctly threw: ${missingPortError}`);
    assert(!!missingPortError && missingPortError.toLowerCase().includes('port'), 'fromJson() throws when port is missing');

    console.log('\n[7d] Port = 0 is rejected (must be between 1 and 65535)');
    const zeroPortError = tryAmqpConfig({ ...validAmqpBase, port: 0 });
    console.log(`  Correctly threw: ${zeroPortError}`);
    assert(!!zeroPortError && zeroPortError.includes('between 1 and 65535'), 'fromJson() throws "AMQP Port must be between 1 and 65535." for port=0');

    console.log('\n[7e] Port = 70000 is rejected (exceeds 65535)');
    const tooHighPortError = tryAmqpConfig({ ...validAmqpBase, port: 70000 });
    console.log(`  Correctly threw: ${tooHighPortError}`);
    assert(!!tooHighPortError && tooHighPortError.includes('between 1 and 65535'), 'fromJson() throws "AMQP Port must be between 1 and 65535." for port=70000');

    console.log('\n[7f] Port = "" (empty string) is rejected');
    const emptyPortError = tryAmqpConfig({ ...validAmqpBase, port: '' });
    console.log(`  Correctly threw: ${emptyPortError}`);
    assert(!!emptyPortError, 'fromJson() throws for port=""  (never silently generates an empty port)');

    console.log('\n[7g] Port = "notanumber" (non-numeric, non-placeholder string) is rejected');
    const nonNumericPortError = tryAmqpConfig({ ...validAmqpBase, port: 'notanumber' });
    console.log(`  Correctly threw: ${nonNumericPortError}`);
    assert(!!nonNumericPortError && nonNumericPortError.includes('between 1 and 65535'), 'fromJson() throws for a non-numeric, non-placeholder port value');

    console.log('\n[7h] Port as a literal valid number (443) is accepted');
    const literalPortFlow = fromJson({
        name: 'Literal Port Flow',
        sender: { type: 'AMQP' as any, config: { ...validAmqpBase, port: 443 } },
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    });
    assert(validate(literalPortFlow).valid, 'a literal numeric port (443) in range [1, 65535] is accepted');

    console.log('\n[7i] Host = "" (empty string) is rejected, not silently accepted as blank');
    const emptyHostError = tryAmqpConfig({ ...validAmqpBase, host: '' });
    console.log(`  Correctly threw: ${emptyHostError}`);
    assert(!!emptyHostError && emptyHostError.includes('Host'), 'fromJson() throws for host=""');

    console.log('\n[7j] Credential Name = "" (empty string) is rejected, not silently accepted as blank');
    const emptyCredError = tryAmqpConfig({ ...validAmqpBase, credentialName: '' });
    console.log(`  Correctly threw: ${emptyCredError}`);
    assert(!!emptyCredError && emptyCredError.includes('Credential Name'), 'fromJson() throws for credentialName=""');

    // ------------------------------------------------------------------
    // [8] Unsupported / invented (RabbitMQ-style) properties rejected
    // ------------------------------------------------------------------
    console.log('\n[8] Unsupported / RabbitMQ-style invented properties are rejected');
    const rabbitMqStyleProps = ['exchange', 'routingKey', 'virtualHost', 'username', 'password', 'connectionFactory', 'queueName'];
    for (const prop of rabbitMqStyleProps) {
        let threw = false;
        try {
            fromJson({
                name: 'x',
                sender: { type: 'AMQP' as any, config: { destinationName: 'Q', [prop]: 'value' } },
                receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
            });
        } catch (err) {
            threw = true;
        }
        assert(threw, `fromJson() rejects invented RabbitMQ-style property "${prop}" (not evidenced in the SAP Event Mesh AMQP reference)`);
    }

    // ------------------------------------------------------------------
    // [9] AMQP Receiver direction rejected (not evidenced)
    // ------------------------------------------------------------------
    console.log('\n[9] AMQP Receiver direction is rejected');
    let threwOnReceiverDirection = false;
    try {
        fromJson({
            name: 'Invalid AMQP Receiver Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            receiver: { type: 'AMQP' as any, config: { destinationName: 'Q' } }
        });
    } catch (err) {
        threwOnReceiverDirection = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnReceiverDirection, 'fromJson() throws when AMQP is used as a Receiver (no AMQP receiver is evidenced)');

    // ------------------------------------------------------------------
    // [10] AMQP declared as a components[] entry is rejected with an
    // actionable error, not the generic "Unsupported component type"
    // ------------------------------------------------------------------
    console.log('\n[10] AMQP declared as a components[] entry is rejected with an actionable error');
    let componentError: string | undefined;
    try {
        fromJson({
            name: 'AMQP As Component',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'amqpStep', type: 'AMQP' as any, config: { destinationName: 'Q' } }],
            connections: [{ from: 'sender', to: 'amqpStep' }, { from: 'amqpStep', to: 'receiver' }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        componentError = (err as Error).message;
        console.log(`  Correctly threw: ${componentError}`);
    }
    assert(!!componentError && componentError.includes('flow-level') && !componentError.startsWith('Unsupported component type'), 'fromJson() gives an actionable error, not the generic "Unsupported component type" message');

    let directCallError: string | undefined;
    try {
        createComponent('AMQP' as any, { destinationName: 'Q' });
    } catch (err) {
        directCallError = (err as Error).message;
        console.log(`  Correctly threw: ${directCallError}`);
    }
    assert(!!directCallError && directCallError.includes('sender'), 'createComponent(\'AMQP\', ...) explains AMQP must be a sender adapter');

    // ------------------------------------------------------------------
    // [11] No duplicate IDs when AMQP is combined with other components
    // ------------------------------------------------------------------
    console.log('\n[11] No duplicate IDs when AMQP is combined with JdbcCall/ProcessCall');
    const combinedJson: IFlowJson = {
        name: 'AMQP With JdbcCall And ProcessCall',
        sender: {
            type: 'AMQP' as any,
            config: {
                destinationName: 'queue:sap/s4/EMD/Batch_D3_InitialLoad_Queue',
                host: '{{EMHOST}}',
                port: '{{EMPORT}}',
                credentialName: '{{EMUser}}'
            }
        },
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
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const combinedFlow = fromJson(combinedJson);
    const combinedValidation = validate(combinedFlow);
    console.log('  validate():', JSON.stringify(combinedValidation));
    assert(combinedValidation.valid, 'AMQP + JdbcCall + ProcessCall combined flow validates');
    const combinedZip = await compileToZip(combinedFlow);
    const combinedIflw = readZipEntry(combinedZip, listZipEntries(combinedZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    const allIds = [...combinedIflw.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
    assert(dupes.length === 0, `zero duplicate XML element ids across ${allIds.length} total ids (AMQP + JdbcCall + ProcessCall combined)`);
    assertNoOrphanStartEnd(combinedIflw, 'AMQP + JdbcCall + ProcessCall combined');

    // ------------------------------------------------------------------
    // [12] Placeholder properties are backed by REAL SAP externalized
    // parameter registrations, not just literal "{{...}}" text sitting in
    // the .iflw with nothing behind it. Reproduces the exact reported
    // regression: a generated ZIP with "{{AMQP_HOST}}" etc. in the .iflw
    // but an empty parameters.prop / "<param_references/>" parameters.propdef,
    // which SAP still rejects as "Attribute 'Host' is mandatory" etc.
    // because the field is only exempted from that check when it's
    // registered as an externalized parameter.
    // ------------------------------------------------------------------
    console.log('\n[12] AMQP placeholder properties are registered as real SAP externalized parameters');
    const placeholderJson: IFlowJson = {
        name: 'AMQP to HTTP Flow',
        sender: {
            type: 'AMQP' as any,
            config: {
                system: 'EventMesh',
                destinationName: '{{AMQP_DESTINATION}}',
                host: '{{AMQP_HOST}}',
                port: '{{AMQP_PORT}}',
                credentialName: '{{AMQP_CREDENTIAL}}'
            }
        },
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const placeholderFlow = fromJson(placeholderJson);
    assert(validate(placeholderFlow).valid, 'flow with placeholder host/port/credentialName/destinationName validates');
    const placeholderZip = await compileToZip(placeholderFlow);
    const placeholderEntries = listZipEntries(placeholderZip);

    const paramPropEntry = placeholderEntries.find(e => e.endsWith('parameters.prop'));
    const paramPropdefEntry = placeholderEntries.find(e => e.endsWith('parameters.propdef'));
    assert(!!paramPropEntry, 'ZIP contains parameters.prop');
    assert(!!paramPropdefEntry, 'ZIP contains parameters.propdef');

    const paramProp = readZipEntry(placeholderZip, paramPropEntry!).toString('utf-8');
    console.log('  parameters.prop:\n' + paramProp.split('\n').map(l => '    ' + l).join('\n'));
    // IMPORTANT: the default value must be NON-EMPTY. A live SAP
    // Integration Suite import proved that an externalized field resolving
    // to an empty string still fails "Attribute is mandatory"/format
    // validation exactly like a literal empty value would -- externalizing
    // a field only makes its value swappable later, it does not exempt the
    // field from needing one. So every default here must be non-blank
    // AND never a real company's actual infrastructure/credential.
    assert(paramProp.includes('AMQP_DESTINATION=REPLACE_WITH_QUEUE_NAME'), 'parameters.prop gives AMQP_DESTINATION a non-empty, clearly-fake default ("REPLACE_WITH_QUEUE_NAME")');
    assert(paramProp.includes('AMQP_HOST=your-event-mesh-host.example.com'), 'parameters.prop gives AMQP_HOST a non-empty, clearly-fake default using the reserved example.com domain');
    assert(paramProp.includes('AMQP_PORT=443'), 'parameters.prop gives AMQP_PORT the evidenced universal default (443, the standard Event Mesh AMQP1.0-over-WSS port -- not tenant-specific)');
    assert(paramProp.includes('AMQP_CREDENTIAL=REPLACE_WITH_CREDENTIAL_NAME'), 'parameters.prop gives AMQP_CREDENTIAL a non-empty, clearly-fake default ("REPLACE_WITH_CREDENTIAL_NAME")');
    assert(!paramProp.includes('enterprise-messaging-messaging-gateway'), 'parameters.prop never contains the real tenant hostname from the reference export');

    const paramPropdef = readZipEntry(placeholderZip, paramPropdefEntry!).toString('utf-8');
    console.log('  parameters.propdef:\n    ' + paramPropdef);
    assert(paramPropdef !== '<?xml version="1.0" encoding="UTF-8" standalone="no"?><parameters><param_references/></parameters>', 'parameters.propdef is NOT just the empty "<param_references/>" baseline');
    assert(/<parameter><key\/><name>AMQP_HOST<\/name><type>xsd:string<\/type>/.test(paramPropdef), 'parameters.propdef declares a <parameter> for AMQP_HOST with type xsd:string');
    assert(/<parameter><key\/><name>AMQP_PORT<\/name><type>xsd:integer<\/type>/.test(paramPropdef), 'parameters.propdef declares a <parameter> for AMQP_PORT with type xsd:integer (matching evidence: EMPORT is xsd:integer)');
    assert(/<parameter><key\/><name>AMQP_CREDENTIAL<\/name><type>xsd:string<\/type>/.test(paramPropdef), 'parameters.propdef declares a <parameter> for AMQP_CREDENTIAL with type xsd:string');
    assert(/<reference attribute_category="EventMesh" attribute_id="\/attrId::host" attribute_uilabel="" param_key="AMQP_HOST"\/>/.test(paramPropdef), 'parameters.propdef references host -> AMQP_HOST using the evidenced short attribute_id form and the configured system as attribute_category');
    assert(/<reference attribute_category="EventMesh" attribute_id="\/attrId::port" attribute_uilabel="" param_key="AMQP_PORT"\/>/.test(paramPropdef), 'parameters.propdef references port -> AMQP_PORT');
    assert(/<reference attribute_category="EventMesh" attribute_id="\/attrId::credentialName" attribute_uilabel="" param_key="AMQP_CREDENTIAL"\/>/.test(paramPropdef), 'parameters.propdef references credentialName -> AMQP_CREDENTIAL');
    assert(/<reference attribute_category="EventMesh" attribute_id="\/attrId::destinationName" attribute_uilabel="" param_key="AMQP_DESTINATION"\/>/.test(paramPropdef), 'parameters.propdef references destinationName -> AMQP_DESTINATION');

    // ------------------------------------------------------------------
    // [13] A flow with NO placeholders still produces the exact original
    // baseline parameters.prop/parameters.propdef -- confirms the fix does
    // not change output for the common case (every non-placeholder AMQP
    // flow, and every other adapter type).
    // ------------------------------------------------------------------
    console.log('\n[13] A flow with literal (non-placeholder) AMQP values produces the unchanged baseline parameters files');
    const literalFlow = fromJson({
        name: 'Literal AMQP Flow',
        sender: { type: 'AMQP' as any, config: { destinationName: 'queue:sap/s4/EMD/Batch_D3_InitialLoad_Queue', host: 'example.com', port: 443, credentialName: 'MyCred' } },
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    });
    const literalZip = await compileToZip(literalFlow);
    const literalEntries = listZipEntries(literalZip);
    const literalPropdef = readZipEntry(literalZip, literalEntries.find(e => e.endsWith('parameters.propdef'))!).toString('utf-8');
    assert(literalPropdef === '<?xml version="1.0" encoding="UTF-8" standalone="no"?><parameters><param_references/></parameters>', 'a flow with no "{{...}}" placeholders produces the exact original baseline parameters.propdef, byte-for-byte unchanged');
    const literalParamProp = readZipEntry(literalZip, literalEntries.find(e => e.endsWith('parameters.prop'))!).toString('utf-8');
    assert(/^#.*\r\n$/.test(literalParamProp), 'a flow with no placeholders produces the exact original baseline parameters.prop (just the timestamp comment)');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
