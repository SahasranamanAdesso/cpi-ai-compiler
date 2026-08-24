/**
 * Regression test - Start/End sequence-flow generation
 *
 * Root cause: BpmnProcessMapper.map() only connected StartEvent_2 to the
 * first component, and the last component to EndEvent_2, inside
 * `if (components.length > 0)` blocks. When a flow has ZERO intermediate
 * components -- "sender -> receiver" directly, which includes any
 * "sender -> RFC receiver" flow, since RFC has no component representation
 * at all (see ComponentFactory.normalizeRfcComponents()) -- BOTH blocks
 * were skipped, leaving StartEvent_2 with zero outgoing sequence flows and
 * EndEvent_2 with zero incoming ones. compileToZip() still succeeded (it
 * only serializes whatever IR it's given), but SAP Integration Suite
 * rejected the result on import with "Start event should have an outgoing
 * sequence flow".
 *
 * Fix: when components.length === 0, connect StartEvent_2 directly to
 * EndEvent_2 instead of skipping the connection entirely.
 *
 * Covers the 5 required scenarios, each checked against the RAW generated
 * .iflw XML (not just validate()'s return value):
 *   1. HTTPS -> RFC (zero components -- the exact reported bug)
 *   2. HTTPS -> ContentModifier -> RFC (one component)
 *   3. HTTPS -> ContentModifier -> ContentModifier -> RFC (multiple components)
 *   4. HTTPS -> ContentModifier -> HTTPS (one component, non-RFC receiver)
 *   5. HTTPS -> HTTPS (zero components, non-RFC receiver)
 *
 * Every scenario verifies: fromJson() succeeds, validate() succeeds,
 * compileToZip() succeeds, the generated .iflw exists, StartEvent_2 has an
 * outgoing sequence flow, EndEvent_2 has an incoming sequence flow, EndEvent_2
 * is actually reachable from StartEvent_2 by following sequence flows (not
 * just "has some incoming edge from somewhere"), and neither event is an
 * isolated orphan.
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

/**
 * Extracts every <bpmn2:sequenceFlow id="..." ... sourceRef="..." targetRef="...">
 * edge from a generated .iflw, regardless of whether ProcessWriter emitted
 * it as a self-closing tag (simple flows) or a multi-line opening tag
 * (Router/Multicast gateway-route flows, which carry extra metadata) --
 * both forms have sourceRef/targetRef on the opening tag itself.
 */
function extractSequenceFlowEdges(iflw: string): Array<{ id: string; sourceRef: string; targetRef: string }> {
    const edges: Array<{ id: string; sourceRef: string; targetRef: string }> = [];
    const regex = /<bpmn2:sequenceFlow id="([^"]+)"[^>]*?sourceRef="([^"]+)"\s+targetRef="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(iflw)) !== null) {
        edges.push({ id: match[1], sourceRef: match[2], targetRef: match[3] });
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

async function checkScenario(name: string, json: IFlowJson): Promise<void> {
    console.log(`\n[${name}]`);

    const flow = fromJson(json);
    const validation = validate(flow);
    console.log('  validate():', JSON.stringify(validation));
    assert(validation.valid, `${name}: validate() succeeds`);

    const zip = await compileToZip(flow);
    assert(zip.length > 0, `${name}: compileToZip() produces a non-empty ZIP`);

    const entries = listZipEntries(zip);
    const iflwEntry = entries.find(e => e.endsWith('.iflw'));
    assert(!!iflwEntry, `${name}: generated .iflw exists in the ZIP`);
    if (!iflwEntry) return;

    const iflw = readZipEntry(zip, iflwEntry).toString('utf-8');
    const edges = extractSequenceFlowEdges(iflw);

    const startOutgoing = edges.filter(e => e.sourceRef === 'StartEvent_2');
    const endIncoming = edges.filter(e => e.targetRef === 'EndEvent_2');

    assert(startOutgoing.length > 0, `${name}: StartEvent_2 has an outgoing sequence flow (no orphan Start)`);
    assert(endIncoming.length > 0, `${name}: EndEvent_2 has an incoming sequence flow (no orphan End)`);
    assert(isEndReachableFromStart(edges), `${name}: EndEvent_2 is actually reachable from StartEvent_2 by following sequence flows`);
    assert(iflw.includes('<bpmn2:startEvent id="StartEvent_2"'), `${name}: StartEvent_2 element present in .iflw`);
    assert(iflw.includes('<bpmn2:endEvent id="EndEvent_2"'), `${name}: EndEvent_2 element present in .iflw`);
}

async function main() {
    console.log('=== Regression: Start/End sequence-flow generation ===');

    // ------------------------------------------------------------------
    // [1] HTTPS -> RFC (zero components -- the exact reported bug)
    // ------------------------------------------------------------------
    await checkScenario('1. HTTPS -> RFC (zero components)', {
        name: 'Employee ID to SAP via RFC',
        sender: { type: 'HTTPS', config: { address: '/employee/id' } },
        receiver: { type: 'RFC' as any, config: { destination: 'S4HANA_RFC_DESTINATION' } }
    });

    // ------------------------------------------------------------------
    // [2] HTTPS -> ContentModifier -> RFC (one component)
    // ------------------------------------------------------------------
    await checkScenario('2. HTTPS -> ContentModifier -> RFC (one component)', {
        name: 'Employee Request via RFC With Transform',
        sender: { type: 'HTTPS', config: { address: '/employee/request' } },
        components: [
            { id: 'transform', type: 'ContentModifier', config: { name: 'Transform', bodyType: 'expression', wrapContent: '${body}' } }
        ],
        connections: [
            { from: 'sender', to: 'transform' },
            { from: 'transform', to: 'receiver' }
        ],
        receiver: { type: 'RFC' as any, config: { destination: 'S4HANA_RFC_DESTINATION' } }
    });

    // ------------------------------------------------------------------
    // [3] HTTPS -> ContentModifier -> ContentModifier -> RFC (multiple components)
    // ------------------------------------------------------------------
    await checkScenario('3. HTTPS -> ContentModifier -> ContentModifier -> RFC (multiple components)', {
        name: 'Employee Request via RFC With Two Transforms',
        sender: { type: 'HTTPS', config: { address: '/employee/request' } },
        components: [
            { id: 'transform1', type: 'ContentModifier', config: { name: 'Transform 1', bodyType: 'expression', wrapContent: '${body}' } },
            { id: 'transform2', type: 'ContentModifier', config: { name: 'Transform 2', bodyType: 'constant', wrapContent: 'final' } }
        ],
        connections: [
            { from: 'sender', to: 'transform1' },
            { from: 'transform1', to: 'transform2' },
            { from: 'transform2', to: 'receiver' }
        ],
        receiver: { type: 'RFC' as any, config: { destination: 'S4HANA_RFC_DESTINATION' } }
    });

    // ------------------------------------------------------------------
    // [4] HTTPS -> ContentModifier -> HTTPS (one component, non-RFC receiver)
    // ------------------------------------------------------------------
    await checkScenario('4. HTTPS -> ContentModifier -> HTTPS (one component, non-RFC)', {
        name: 'Order Processing With Transform',
        sender: { type: 'HTTPS', config: { address: '/orders' } },
        components: [
            { id: 'transform', type: 'ContentModifier', config: { name: 'Transform', bodyType: 'constant', wrapContent: 'x' } }
        ],
        connections: [
            { from: 'sender', to: 'transform' },
            { from: 'transform', to: 'receiver' }
        ],
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com', method: 'POST' } }
    });

    // ------------------------------------------------------------------
    // [5] HTTPS -> HTTPS (zero components, non-RFC receiver)
    // ------------------------------------------------------------------
    await checkScenario('5. HTTPS -> HTTPS (zero components, non-RFC)', {
        name: 'Simple Passthrough',
        sender: { type: 'HTTPS', config: { address: '/passthrough' } },
        receiver: { type: 'HTTPS', config: { url: 'https://downstream.example.com', method: 'POST' } }
    });

    // ------------------------------------------------------------------
    // [6] Explicit "sender -> receiver" connection (no components), the
    // literal shape called out in the task -- confirms it produces the
    // internal Start -> End sequence flow, not just adapter-level metadata.
    // ------------------------------------------------------------------
    await checkScenario('6. Explicit sender -> receiver connection, zero components', {
        name: 'Explicit Connection Passthrough',
        sender: { type: 'HTTPS', config: { address: '/x' } },
        connections: [{ from: 'sender', to: 'receiver' }],
        receiver: { type: 'HTTPS', config: { url: 'https://example.com', method: 'POST' } }
    });

    console.log(`\n=== ${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'} ===`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Regression test crashed:', err);
    process.exit(1);
});
