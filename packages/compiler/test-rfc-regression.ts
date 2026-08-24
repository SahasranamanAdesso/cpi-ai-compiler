/**
 * Regression test - RFC receiver adapter support
 *
 * Evidence source: rfc_reference.zip, "Send Quality Deviation from D3 to
 * S4HANA.iflw", MessageFlow_6 (sourceRef="EndEvent_2" targetRef="Participant_2"
 * -- the flow-level receiver pattern, same shape as HTTP/SOAP/SFTP/IDoc, NOT
 * a mid-flow serviceTask call like JdbcCall/ProcessDirectCall):
 *   ComponentType=RFC, TransportProtocol=RFC, MessageProtocol=Synchronous RFC,
 *   ComponentNS=sap, ComponentSWCVName=external, ComponentSWCVId=1.2.1,
 *   componentVersion=1.2, TransportProtocolVersion=1.2.1,
 *   MessageProtocolVersion=1.2.1, direction=Receiver, system=S4HANA,
 *   destination={{S4 RFC Destination}}, transactioncommit={{...}}, newConnection={{...}}
 *   cmdVariantUri=ctype::AdapterVariant/cname::sap:RFC/tp::RFC/mp::Synchronous RFC/direction::Receiver/version::1.2.1
 * parameters.propdef confirms exactly 3 externalizable RFC attributes:
 * destination (xsd:string), transactioncommit (xsd:boolean), newConnection (xsd:boolean).
 *
 * Covers:
 *   1. Capability discovery.
 *   2. RFC as flow-level receiver (single instance).
 *   3. RFC + ContentModifier (validate/transform before sending via RFC).
 *   4. fromJson() -> validate().
 *   5. compileToZip().
 *   6. Generated .iflw contains the expected RFC structure.
 *   7. Invalid RFC configuration rejected (missing destination).
 *   8. Unsupported RFC properties rejected.
 *   9. RFC Sender direction rejected (SAP CPI has no RFC sender).
 *  10. Existing regression suites still pass -- verified separately by
 *      re-running test-jdbc-regression.ts, test-processdirect-regression.ts,
 *      test-localintegrationprocess-regression.ts, test-naming-version-regression.ts,
 *      test/run-rt-003-tests.ts, test/run-mapping-regression-simple.ts.
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

async function main() {
    console.log('=== Regression: RFC receiver adapter support ===\n');

    // ------------------------------------------------------------------
    // [1] Capability discovery
    // ------------------------------------------------------------------
    console.log('[1] getCapabilities() exposes RFC');
    const caps = getCapabilities();
    const rfcReceiverCap = caps.adapters.find(a => a.type === 'RFC' && a.direction === 'Receiver');
    const rfcSenderCap = caps.adapters.find(a => a.type === 'RFC' && a.direction === 'Sender');
    assert(!!rfcReceiverCap, 'capabilities.adapters includes RFC Receiver');
    assert(!!rfcReceiverCap?.requiredProperties.includes('destination'), 'RFC Receiver requires destination');
    assert(!rfcSenderCap, 'capabilities.adapters does NOT include an RFC Sender (no RFC sender exists in SAP CPI)');

    // ------------------------------------------------------------------
    // [2] RFC as flow-level receiver, single instance
    // ------------------------------------------------------------------
    console.log('\n[2] RFC as flow-level receiver');
    const singleJson: IFlowJson = {
        name: 'Quality Deviation to S4HANA via RFC',
        sender: { type: 'HTTPS', config: { address: '/quality/deviation' } },
        receiver: { type: 'RFC' as any, config: { destination: 'S4_RFC_DEST', system: 'S4HANA' } }
    };
    const singleFlow = fromJson(singleJson);
    const singleValidation = validate(singleFlow);
    console.log('  validate():', JSON.stringify(singleValidation));
    assert(singleValidation.valid, 'flow with RFC receiver validates');
    assert(singleValidation.errors.length === 0, 'no validation errors');

    const singleZip = await compileToZip(singleFlow);
    const singleEntries = listZipEntries(singleZip);
    const singleIflw = readZipEntry(singleZip, singleEntries.find(e => e.endsWith('.iflw'))!).toString('utf-8');

    // [6] Generated .iflw structural checks against evidence
    const rfcMfMatch = singleIflw.match(/<bpmn2:messageFlow id="([^"]+)" name="([^"]+)" sourceRef="EndEvent_2" targetRef="Participant_2">([\s\S]*?)<\/bpmn2:messageFlow>/);
    assert(!!rfcMfMatch, 'iflw contains a flow-level RFC messageFlow (EndEvent_2 -> Participant_2, same shape as HTTP/SOAP receiver)');
    if (rfcMfMatch) {
        const body = rfcMfMatch[3];
        assert(body.includes('<key>ComponentType</key>') && body.includes('<value>RFC</value>'), 'messageFlow has ComponentType=RFC');
        assert(body.includes('<key>TransportProtocol</key>') && /<key>TransportProtocol<\/key>\s*<value>RFC<\/value>/.test(body), 'messageFlow has TransportProtocol=RFC');
        assert(/<key>MessageProtocol<\/key>\s*<value>Synchronous RFC<\/value>/.test(body), 'messageFlow has MessageProtocol=Synchronous RFC');
        assert(/<key>ComponentNS<\/key>\s*<value>sap<\/value>/.test(body), 'messageFlow has ComponentNS=sap');
        assert(/<key>destination<\/key>\s*<value>S4_RFC_DEST<\/value>/.test(body), 'messageFlow carries the configured destination');
        assert(/<key>system<\/key>\s*<value>S4HANA<\/value>/.test(body), 'messageFlow carries the configured system name');
        assert(/<key>componentVersion<\/key>\s*<value>1\.2<\/value>/.test(body), 'messageFlow componentVersion matches evidence (1.2)');
        assert(/<key>cmdVariantUri<\/key>\s*<value>ctype::AdapterVariant\/cname::sap:RFC\/tp::RFC\/mp::Synchronous RFC\/direction::Receiver\/version::1\.2\.1<\/value>/.test(body), 'messageFlow cmdVariantUri matches evidence exactly');
        assert(/<key>direction<\/key>\s*<value>Receiver<\/value>/.test(body), 'messageFlow direction=Receiver');
        assert(!body.includes('<key>Vendor</key>'), 'messageFlow has NO Vendor property (confirmed absent in evidence, unlike JDBC/ProcessDirect)');
        assert(/<key>transactioncommit<\/key>\s*<value>false<\/value>/.test(body), 'transactioncommit defaults to false when not configured');
        assert(/<key>newConnection<\/key>\s*<value>false<\/value>/.test(body), 'newConnection defaults to false when not configured');
    }

    // ------------------------------------------------------------------
    // [3] RFC + ContentModifier (validate/transform before sending via RFC)
    // ------------------------------------------------------------------
    console.log('\n[3] RFC + ContentModifier');
    const withCmJson: IFlowJson = {
        name: 'Invoice to S4HANA via RFC',
        sender: { type: 'HTTPS', config: { address: '/invoices/receive' } },
        components: [
            { id: 'transformInvoice', type: 'ContentModifier', config: { name: 'Transform Invoice', bodyType: 'expression', wrapContent: '${body}' } }
        ],
        connections: [
            { from: 'sender', to: 'transformInvoice' },
            { from: 'transformInvoice', to: 'receiver' }
        ],
        receiver: {
            type: 'RFC' as any,
            config: { name: 'Send to S4HANA', destination: 'S4_RFC_DEST', system: 'S4HANA', transactioncommit: true, newConnection: true }
        }
    };
    const withCmFlow = fromJson(withCmJson);
    const withCmValidation = validate(withCmFlow);
    console.log('  validate():', JSON.stringify(withCmValidation));
    assert(withCmValidation.valid, 'RFC + ContentModifier flow validates');
    const withCmZip = await compileToZip(withCmFlow);
    const withCmIflw = readZipEntry(withCmZip, listZipEntries(withCmZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert(withCmIflw.includes('name="Transform Invoice"'), 'ContentModifier step present before RFC receiver');
    const configuredBoolsMatch = withCmIflw.match(/<bpmn2:messageFlow id="[^"]+" name="[^"]+" sourceRef="EndEvent_2"[\s\S]*?<\/bpmn2:messageFlow>/);
    assert(!!configuredBoolsMatch && /<key>transactioncommit<\/key>\s*<value>true<\/value>/.test(configuredBoolsMatch[0]), 'transactioncommit=true is honored when explicitly configured');
    assert(!!configuredBoolsMatch && /<key>newConnection<\/key>\s*<value>true<\/value>/.test(configuredBoolsMatch[0]), 'newConnection=true is honored when explicitly configured');

    // ------------------------------------------------------------------
    // [7] Invalid configuration rejected
    // ------------------------------------------------------------------
    console.log('\n[7] Invalid RFC configuration is rejected');
    let threwOnMissingDestination = false;
    try {
        fromJson({
            name: 'Missing Destination Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            receiver: { type: 'RFC' as any, config: { system: 'S4HANA' } }
        });
    } catch (err) {
        threwOnMissingDestination = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMissingDestination, 'fromJson() throws when destination is missing');

    // ------------------------------------------------------------------
    // [8] Unsupported properties rejected
    // ------------------------------------------------------------------
    console.log('\n[8] Unsupported RFC properties are rejected');
    let threwOnUnsupported = false;
    try {
        fromJson({
            name: 'Unsupported Property Flow',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            receiver: { type: 'RFC' as any, config: { destination: 'S4_RFC_DEST', functionModule: 'BAPI_SALESORDER_CREATE' } }
        });
    } catch (err) {
        threwOnUnsupported = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnUnsupported, 'fromJson() throws on an unsupported RFC property (e.g. "functionModule") instead of silently accepting it');

    // ------------------------------------------------------------------
    // [9] RFC Sender direction rejected
    // ------------------------------------------------------------------
    console.log('\n[9] RFC Sender direction is rejected');
    let threwOnSenderDirection = false;
    try {
        fromJson({
            name: 'Invalid RFC Sender Flow',
            sender: { type: 'RFC' as any, config: { destination: 'S4_RFC_DEST' } },
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        threwOnSenderDirection = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnSenderDirection, 'fromJson() throws when RFC is used as a Sender (SAP CPI has no RFC sender)');

    // ------------------------------------------------------------------
    // [10] RFC declared as a mid-flow "component" (a common AI JSON
    // mistake) is normalized into the flow's real receiver instead of
    // throwing "Unsupported component type: RFC" or being silently
    // dropped. Reproduces the exact reported AI-generated JSON.
    // ------------------------------------------------------------------
    console.log('\n[10] RFC declared as a components[] entry is normalized to the flow receiver');
    const reportedAiJson: any = {
        name: 'EmployeeRequestToRFC',
        sender: { type: 'HTTPS', config: { address: '/employee/request' } },
        components: [
            { id: 'rfc_receiver_component', type: 'RFC', config: { destination: 'S4HANA_RFC_DESTINATION' } }
        ],
        receiver: { type: 'RFC', config: { destination: 'S4HANA_RFC_DESTINATION' } },
        connections: [
            { from: 'sender', to: 'rfc_receiver_component' },
            { from: 'rfc_receiver_component', to: 'receiver' }
        ],
        resources: []
    };
    const reportedFlow = fromJson(reportedAiJson);
    assert(reportedFlow.getComponents().length === 0, 'the RFC "component" is removed from the main component chain (it has no BPMN mid-flow shape)');
    assert((reportedFlow.getReceiver() as any)?.properties?.ComponentType === 'RFC', 'the flow\'s receiver is set to RFC from the normalized component config');
    const reportedValidation = validate(reportedFlow);
    console.log('  validate():', JSON.stringify(reportedValidation));
    assert(reportedValidation.valid, 'the normalized flow validates with zero errors');
    const reportedZip = await compileToZip(reportedFlow);
    assert(reportedZip.length > 0, 'compileToZip() succeeds for the exact reported AI JSON');
    const reportedIflw = readZipEntry(reportedZip, listZipEntries(reportedZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    assert(/<bpmn2:messageFlow[^>]*sourceRef="EndEvent_2"[\s\S]*?<value>RFC<\/value>[\s\S]*?<value>S4HANA_RFC_DESTINATION<\/value>/.test(reportedIflw), 'generated .iflw contains the RFC receiver messageFlow with the configured destination');

    // ------------------------------------------------------------------
    // [11] RFC declared ONLY as a component (no explicit "receiver" at
    // all) is still normalized correctly.
    // ------------------------------------------------------------------
    console.log('\n[11] RFC as the only components[] entry (no explicit receiver) is normalized');
    const componentOnlyJson: any = {
        name: 'RFC Component Only',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [{ id: 'callRfc', type: 'RFC', config: { destination: 'S4HANA_RFC_DESTINATION' } }],
        connections: [{ from: 'sender', to: 'callRfc' }, { from: 'callRfc', to: 'receiver' }]
    };
    const componentOnlyFlow = fromJson(componentOnlyJson);
    const componentOnlyValidation = validate(componentOnlyFlow);
    assert(componentOnlyValidation.valid, 'a flow with RFC declared only as a component (no explicit receiver) still validates');
    const componentOnlyZip = await compileToZip(componentOnlyFlow);
    assert(componentOnlyZip.length > 0, 'compileToZip() succeeds when RFC is declared only as a component');

    // ------------------------------------------------------------------
    // [12] Conflicting RFC component + receiver configs are rejected, not
    // silently guessed.
    // ------------------------------------------------------------------
    console.log('\n[12] Conflicting RFC component + receiver configuration is rejected');
    let threwOnConflict = false;
    try {
        fromJson({
            name: 'Conflicting RFC',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'rfcA', type: 'RFC' as any, config: { destination: 'DEST_A' } }],
            receiver: { type: 'RFC' as any, config: { destination: 'DEST_B' } },
            connections: [{ from: 'sender', to: 'rfcA' }, { from: 'rfcA', to: 'receiver' }]
        });
    } catch (err) {
        threwOnConflict = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnConflict, 'fromJson() throws when an RFC component and a "receiver" of type RFC disagree, rather than silently picking one');

    // ------------------------------------------------------------------
    // [13] RFC component with a conflicting non-RFC receiver is rejected.
    // ------------------------------------------------------------------
    console.log('\n[13] RFC component + a differently-typed receiver is rejected');
    let threwOnTypeConflict = false;
    try {
        fromJson({
            name: 'RFC Component Vs HTTPS Receiver',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'rfcB', type: 'RFC' as any, config: { destination: 'DEST' } }],
            connections: [{ from: 'sender', to: 'rfcB' }, { from: 'rfcB', to: 'receiver' }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        threwOnTypeConflict = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnTypeConflict, 'fromJson() throws when an RFC component and a differently-typed receiver are both declared');

    // ------------------------------------------------------------------
    // [14] Multiple RFC components are rejected (RFC has no multi-instance
    // mid-flow shape -- a flow has exactly one receiver).
    // ------------------------------------------------------------------
    console.log('\n[14] Multiple RFC components are rejected');
    let threwOnMultiple = false;
    try {
        fromJson({
            name: 'Multiple RFC Components',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [
                { id: 'rfc1', type: 'RFC' as any, config: { destination: 'DEST_1' } },
                { id: 'rfc2', type: 'RFC' as any, config: { destination: 'DEST_2' } }
            ],
            connections: [{ from: 'sender', to: 'rfc1' }, { from: 'rfc1', to: 'rfc2' }, { from: 'rfc2', to: 'receiver' }]
        });
    } catch (err) {
        threwOnMultiple = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnMultiple, 'fromJson() throws when more than one RFC component is declared');

    // ------------------------------------------------------------------
    // [15] createComponent('RFC', ...) called directly (bypassing
    // fromJson()'s normalization) gives a clear, actionable error instead
    // of the generic "Unsupported component type: RFC".
    // ------------------------------------------------------------------
    console.log('\n[15] createComponent(\'RFC\', ...) directly gives an actionable error');
    let directCallError: string | undefined;
    try {
        createComponent('RFC' as any, { destination: 'DEST' });
    } catch (err) {
        directCallError = (err as Error).message;
        console.log(`  Correctly threw: ${directCallError}`);
    }
    assert(!!directCallError && directCallError.includes('receiver') && !directCallError.startsWith('Unsupported component type'), 'createComponent(\'RFC\', ...) explains RFC must be a receiver, not the generic "Unsupported component type" message');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
