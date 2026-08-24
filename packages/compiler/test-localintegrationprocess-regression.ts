/**
 * Regression test - Local Integration Process / ProcessCall wiring
 *
 * Reproduces and fixes the exact reported bug from a real generated ZIP
 * ("flow (9).zip"):
 *   1. "The assigned Local Integration Process does not exist" -- a
 *      ProcessCall's `processId` ("/process/orders") never matched any
 *      actual <bpmn2:process> in the .iflw, because Local Integration
 *      Processes were modeled (LocalIntegrationProcess.ts, IFlow.addSubProcess())
 *      and even built by fromJson()'s `subProcesses` handling, but NEVER
 *      consumed by BpmnProcessMapper -- so nothing was ever emitted for
 *      them at all.
 *   2. "Prepare Order Data" (a ContentModifier) rendered as SAP's generic
 *      placeholder description instead of actually running, because
 *      `bodyType: "Expression"` (wrong case) and `wrapContent: false`
 *      (wrong type) were passed straight through with zero validation.
 *
 * Ground truth for the Local Integration Process's exact BPMN shape:
 * process_direct_reference.zip, Process_49 ("Exception Handling",
 * processType=directCall, cmdVariantUri=.../LocalIntegrationProcess/1.1.3),
 * its plain (non-message) StartEvent_50/EndEvent_51, its participant
 * Participant_Process_49 (processRef=Process_49), and the ProcessCall
 * (CallActivity_45) inside SubProcess_39 with processId=Process_49 -- all
 * documented in commit3_local-integration-process-fix.readme.
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

async function main() {
    console.log('=== Regression: Local Integration Process / ProcessCall wiring ===\n');

    // ------------------------------------------------------------------
    // [1] The exact reported scenario: HTTPS Sender -> Prepare Order Data
    // (ContentModifier) -> Call Order Process (ProcessCall) -> Create
    // Response (GroovyScript) -> HTTP Receiver, with a real Local
    // Integration Process ("Order Process") that Call Order Process
    // resolves to.
    // ------------------------------------------------------------------
    console.log('[1] Reported scenario: HTTPS -> Prepare Order Data -> Call Order Process -> Create Response -> HTTP');
    const reportedJson: IFlowJson = {
        name: 'HTTPS to Local Integration Process Flow',
        sender: { type: 'HTTPS', config: { address: '/api/orders' } },
        components: [
            {
                id: 'prepareOrderData',
                type: 'ContentModifier',
                config: { name: 'Prepare Order Data', bodyType: 'expression', wrapContent: '${body}' }
            },
            {
                id: 'callSubProcess',
                type: 'ProcessCall',
                config: { name: 'Call Order Process', processId: 'orderProcess' }
            },
            {
                id: 'createResponse',
                type: 'GroovyScript',
                config: { name: 'Create Response', scriptName: 'create_response.groovy' }
            }
        ],
        connections: [
            { from: 'sender', to: 'prepareOrderData' },
            { from: 'prepareOrderData', to: 'callSubProcess' },
            { from: 'callSubProcess', to: 'createResponse' },
            { from: 'createResponse', to: 'receiver' }
        ],
        // The Local Integration Process "Call Order Process" invokes --
        // this is what was completely missing before this fix.
        subProcesses: [
            {
                id: 'orderProcess',
                name: 'Order Process',
                components: [
                    { id: 'validateOrder', type: 'ContentModifier', config: { name: 'Validate Order', bodyType: 'constant', wrapContent: 'validated' } }
                ]
            }
        ],
        receiver: { type: 'HTTP', config: { url: 'https://receiver-system.com/api/callback', method: 'POST' } },
        resources: [
            { type: 'groovy', name: 'create_response.groovy', content: "import com.sap.gateway.ip.core.customdev.util.Message\n\nMessage processData(Message message) {\n    return message\n}" }
        ]
    };

    const reportedFlow = fromJson(reportedJson);
    const reportedValidation = validate(reportedFlow);
    console.log('  validate():', JSON.stringify(reportedValidation));
    assert(reportedValidation.valid, 'reported scenario validates with zero errors');
    assert(reportedValidation.errors.filter(e => e.code === 'PC-001').length === 0, 'ProcessCall resolves to the declared Local Integration Process (no PC-001)');

    const reportedZip = await compileToZip(reportedFlow);
    const reportedEntries = listZipEntries(reportedZip);
    const reportedIflw = readZipEntry(reportedZip, reportedEntries.find(e => e.endsWith('.iflw'))!).toString('utf-8');

    // --- Fix #1 verification: Local Integration Process actually exists ---
    const lipProcessMatch = reportedIflw.match(/<bpmn2:process id="([^"]+)" name="Order Process">([\s\S]*?)<\/bpmn2:process>/);
    assert(!!lipProcessMatch, 'a sibling <bpmn2:process name="Order Process"> exists in the generated .iflw');
    if (lipProcessMatch) {
        const lipId = lipProcessMatch[1];
        const lipBody = lipProcessMatch[2];
        assert(lipBody.includes('<key>processType</key>') && /<key>processType<\/key>\s*<value>directCall<\/value>/.test(lipBody), 'Local Integration Process has processType=directCall');
        assert(/<key>cmdVariantUri<\/key>\s*<value>ctype::FlowElementVariant\/cname::LocalIntegrationProcess\/version::1\.1\.3<\/value>/.test(lipBody), 'Local Integration Process cmdVariantUri matches evidence (version 1.1.3)');
        assert(/<key>transactionalHandling<\/key>\s*<value>From Calling Process<\/value>/.test(lipBody), 'Local Integration Process defaults transactionalHandling to "From Calling Process"');
        assert(lipBody.includes('<bpmn2:startEvent') && !lipBody.match(/<bpmn2:startEvent[\s\S]*?<\/bpmn2:startEvent>/)?.[0].includes('messageEventDefinition'), 'Local Integration Process start event has NO messageEventDefinition (plain event, per evidence)');
        assert(lipBody.includes('<bpmn2:endEvent') && !lipBody.match(/<bpmn2:endEvent[\s\S]*?<\/bpmn2:endEvent>/)?.[0].includes('messageEventDefinition'), 'Local Integration Process end event has NO messageEventDefinition (plain event, per evidence)');
        assert(lipBody.includes('name="Validate Order"'), 'Local Integration Process contains its own component (Validate Order)');

        // --- Participant referencing it ---
        const participantRegex = new RegExp(`<bpmn2:participant id="([^"]+)" ifl:type="IntegrationProcess" name="Order Process" processRef="${lipId}">`);
        assert(participantRegex.test(reportedIflw), `a collaboration participant references processRef="${lipId}"`);

        // --- The exact SAP check: ProcessCall.processId === LIP's real id ---
        const processCallMatch = reportedIflw.match(/<bpmn2:callActivity id="callSubProcess"[\s\S]*?<\/bpmn2:callActivity>/);
        assert(!!processCallMatch, 'Call Order Process callActivity exists');
        if (processCallMatch) {
            const body = processCallMatch[0];
            assert(body.includes('<key>activityType</key>') && /<key>activityType<\/key>\s*<value>ProcessCallElement<\/value>/.test(body), 'ProcessCall activityType=ProcessCallElement');
            assert(new RegExp(`<key>processId</key>\\s*<value>${lipId}</value>`).test(body), `ProcessCall's processId value equals the Local Integration Process's real id ("${lipId}") -- this exact match is what SAP checks for "The assigned Local Integration Process does not exist"`);
            assert(/<key>subActivityType<\/key>\s*<value>NonLoopingProcess<\/value>/.test(body), 'ProcessCall subActivityType=NonLoopingProcess (matches evidence)');
        }
    }

    // --- Fix #2 verification: Prepare Order Data has real content, correct case ---
    const cmMatch = reportedIflw.match(/<bpmn2:callActivity id="prepareOrderData"[\s\S]*?<\/bpmn2:callActivity>/);
    assert(!!cmMatch, 'Prepare Order Data callActivity exists');
    if (cmMatch) {
        const body = cmMatch[0];
        assert(/<key>bodyType<\/key>\s*<value>expression<\/value>/.test(body), 'bodyType is normalized to lowercase "expression" (not "Expression")');
        assert(/<key>wrapContent<\/key>\s*<value>\$\{body\}<\/value>/.test(body), 'wrapContent carries the real expression content (not the literal string "false")');
    }

    // ------------------------------------------------------------------
    // [2] ProcessCall referencing a Local Integration Process placed inside
    // an Exception Subprocess -- matches the real evidence pattern exactly
    // (process_direct_reference.zip: CallActivity_45 lives inside
    // SubProcess_39, targeting sibling Process_49).
    // ------------------------------------------------------------------
    console.log('\n[2] ProcessCall inside an exceptionSubprocess, targeting a sibling Local Integration Process');
    const exceptionJson: IFlowJson = {
        name: 'Exception Handling With Local Process',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            { id: 'main1', type: 'ContentModifier', config: { name: 'Main Step', bodyType: 'constant', wrapContent: 'x' } }
        ],
        connections: [
            { from: 'sender', to: 'main1' },
            { from: 'main1', to: 'receiver' }
        ],
        subProcesses: [
            {
                id: 'errorDetailsProcess',
                name: 'Error Details Process',
                components: [
                    { id: 'setErrorDetails', type: 'ContentModifier', config: { name: 'Set Error Details', bodyType: 'expression', wrapContent: '${exception.message}' } }
                ]
            }
        ],
        exceptionSubprocesses: [
            {
                name: 'Global Exception Handling',
                components: [
                    { id: 'callErrorDetails', type: 'ProcessCall', config: { name: 'Call Error Details', processId: 'errorDetailsProcess' } }
                ]
            }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const exceptionFlow = fromJson(exceptionJson);
    const exceptionValidation = validate(exceptionFlow);
    console.log('  validate():', JSON.stringify(exceptionValidation));
    assert(exceptionValidation.valid, 'ProcessCall inside exceptionSubprocess resolves correctly');
    assert(exceptionValidation.errors.filter(e => e.code === 'PC-001').length === 0, 'no PC-001 for exceptionSubprocess-nested ProcessCall');

    // ------------------------------------------------------------------
    // [3] Multiple Local Integration Processes -- no duplicate ids
    // ------------------------------------------------------------------
    console.log('\n[3] Multiple Local Integration Processes -- no duplicate ids');
    const multiLipJson: IFlowJson = {
        name: 'Multiple Local Integration Processes',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            { id: 'callFirst', type: 'ProcessCall', config: { name: 'Call First', processId: 'firstProcess' } },
            { id: 'callSecond', type: 'ProcessCall', config: { name: 'Call Second', processId: 'secondProcess' } }
        ],
        connections: [
            { from: 'sender', to: 'callFirst' },
            { from: 'callFirst', to: 'callSecond' },
            { from: 'callSecond', to: 'receiver' }
        ],
        subProcesses: [
            { id: 'firstProcess', name: 'First Process', components: [{ id: 'firstStep', type: 'ContentModifier', config: { name: 'Step', bodyType: 'constant', wrapContent: 'a' } }] },
            { id: 'secondProcess', name: 'Second Process', components: [{ id: 'secondStep', type: 'ContentModifier', config: { name: 'Step', bodyType: 'constant', wrapContent: 'b' } }] }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const multiLipFlow = fromJson(multiLipJson);
    const multiLipIds = multiLipFlow.getSubProcesses().map(sp => sp.id);
    assert(new Set(multiLipIds).size === 2, 'both Local Integration Process ids are unique');
    const multiLipValidation = validate(multiLipFlow);
    assert(multiLipValidation.valid, 'multiple Local Integration Processes validate cleanly');
    const multiLipZip = await compileToZip(multiLipFlow);
    const multiLipIflw = readZipEntry(multiLipZip, listZipEntries(multiLipZip).find(e => e.endsWith('.iflw'))!).toString('utf-8');
    const lipProcessElements = [...multiLipIflw.matchAll(/<bpmn2:process id="([^"]+)" name="(First Process|Second Process)">/g)];
    assert(lipProcessElements.length === 2, `both Local Integration Process <bpmn2:process> elements present (found ${lipProcessElements.length})`);
    const allIdsInMultiLip = [...multiLipIflw.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
    const dupesInMultiLip = allIdsInMultiLip.filter((id, i) => allIdsInMultiLip.indexOf(id) !== i);
    assert(dupesInMultiLip.length === 0, `zero duplicate XML element ids across ${allIdsInMultiLip.length} total ids with 2 Local Integration Processes`);

    // ------------------------------------------------------------------
    // [4] PC-001: ProcessCall referencing a nonexistent Local Integration
    // Process is rejected, not silently accepted.
    // ------------------------------------------------------------------
    console.log('\n[4] PC-001: ProcessCall to a nonexistent Local Integration Process is rejected');
    const missingTargetJson: IFlowJson = {
        name: 'Missing Process Call Target',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [
            { id: 'badCall', type: 'ProcessCall', config: { name: 'Call Nothing', processId: 'doesNotExist' } }
        ],
        connections: [
            { from: 'sender', to: 'badCall' },
            { from: 'badCall', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    };
    const missingTargetFlow = fromJson(missingTargetJson);
    const missingTargetValidation = validate(missingTargetFlow);
    console.log('  validate():', JSON.stringify(missingTargetValidation));
    assert(!missingTargetValidation.valid, 'flow with an unresolvable ProcessCall target is INVALID');
    assert(missingTargetValidation.errors.some(e => e.code === 'PC-001'), 'PC-001 error is reported for the unresolvable ProcessCall');

    // ------------------------------------------------------------------
    // [5] ContentModifier validation: bad bodyType / wrong-typed wrapContent
    // rejected at construction time, not silently serialized.
    // ------------------------------------------------------------------
    console.log('\n[5] ContentModifier rejects invalid bodyType / wrapContent type');
    let threwOnBadBodyType = false;
    try {
        fromJson({
            name: 'x',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'bad', type: 'ContentModifier', config: { bodyType: 'xml-not-a-real-value' } }],
            connections: [{ from: 'sender', to: 'bad' }, { from: 'bad', to: 'receiver' }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        threwOnBadBodyType = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnBadBodyType, 'fromJson() throws on an unrecognized ContentModifier bodyType');

    let threwOnBadWrapContentType = false;
    try {
        fromJson({
            name: 'x',
            sender: { type: 'HTTPS', config: { address: '/x' } },
            components: [{ id: 'bad2', type: 'ContentModifier', config: { bodyType: 'expression', wrapContent: false as any } }],
            connections: [{ from: 'sender', to: 'bad2' }, { from: 'bad2', to: 'receiver' }],
            receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
        });
    } catch (err) {
        threwOnBadWrapContentType = true;
        console.log(`  Correctly threw: ${(err as Error).message}`);
    }
    assert(threwOnBadWrapContentType, 'fromJson() throws when wrapContent is a boolean instead of a string (the exact reported bug)');

    // Case-insensitive normalization still works for a valid value spelled
    // with the wrong case (the exact reported bug's other half).
    const normalizedFlow = fromJson({
        name: 'x',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        components: [{ id: 'ok', type: 'ContentModifier', config: { bodyType: 'Expression', wrapContent: 'hello' } }],
        connections: [{ from: 'sender', to: 'ok' }, { from: 'ok', to: 'receiver' }],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    });
    const normalizedComponent: any = normalizedFlow.getComponents()[0];
    assert(normalizedComponent.properties.bodyType === 'expression', 'bodyType "Expression" (wrong case) is normalized to "expression", not rejected');

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
