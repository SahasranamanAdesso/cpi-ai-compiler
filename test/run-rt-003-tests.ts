/**
 * RT-003 Router Validation Regression Tests
 * Manual test runner
 */

import { fromJson } from '../packages/compiler/src/factory/ComponentFactory';
import { validate } from '../packages/compiler/src/api/validate';
import { IdGenerator } from '../packages/compiler/src/utils/IdGenerator';

let passCount = 0;
let failCount = 0;

// Sleep to avoid Date.now() collisions
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function runTest(name: string, testFn: () => void) {
    try {
        testFn();
        console.log(`✓ ${name}`);
        passCount++;
    } catch (error) {
        console.log(`✗ ${name}`);
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        failCount++;
    }
}

function expect(actual: any) {
    return {
        toBe: (expected: any) => {
            if (actual !== expected) {
                throw new Error(`Expected ${expected}, got ${actual}`);
            }
        },
        toHaveLength: (length: number) => {
            if (!Array.isArray(actual) || actual.length !== length) {
                throw new Error(`Expected array of length ${length}, got ${Array.isArray(actual) ? actual.length : 'not an array'}`);
            }
        },
        toContain: (substring: string) => {
            if (typeof actual !== 'string' || !actual.includes(substring)) {
                throw new Error(`Expected string to contain "${substring}"`);
            }
        }
    };
}

console.log('\n=== RT-003 Router Validation Tests ===\n');

runTest('1. Router → component using canonical ID + correct connection => PASS', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [{ condition: '${x}', target: 'groovy1' }],
                    defaultRoute: { target: 'groovy2' }
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            },
            {
                id: 'groovy2',
                type: 'GroovyScript' as const,
                config: { name: 'Script 2', scriptName: 'script2.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'groovy1' },
            { from: 'router1', to: 'groovy2' }
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
});

runTest('2. Router → component + missing connection => RT-003', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [{ condition: '${x}', target: 'groovy1' }],
                    defaultRoute: { target: 'groovy2' }
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            },
            {
                id: 'groovy2',
                type: 'GroovyScript' as const,
                config: { name: 'Script 2', scriptName: 'script2.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'groovy1' }
            // Missing: { from: 'router1', to: 'groovy2' }
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('RT-003');
    expect(result.errors[0].message).toContain('groovy2');
});

runTest('3. Router → flow-level receiver endpoint => PASS', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [{ condition: '${x}', target: 'groovy1' }],
                    defaultRoute: { target: 'receiver' }  // Flow-level receiver
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'groovy1' }
            // NO connection to 'receiver' - it's a flow adapter
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
});

runTest('4. Router → flow-level sender endpoint => PASS', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [{ condition: '${x}', target: 'sender' }],  // Flow-level sender
                    defaultRoute: { target: 'groovy1' }
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'groovy1' }
            // NO connection to 'sender' - it's a flow adapter
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
});

runTest('5. Component whose canonical ID is "receiver" => requires connection', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [{ condition: '${x}', target: 'groovy1' }],
                    defaultRoute: { target: 'receiver' }  // Component named "receiver"
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            },
            {
                id: 'receiver',  // Component with canonical ID "receiver"
                type: 'GroovyScript' as const,
                config: { name: 'Receiver Script', scriptName: 'receiver.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'groovy1' },
            { from: 'router1', to: 'receiver' }  // Connection to component named "receiver"
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
});

runTest('6. Component whose canonical ID is "sender" => requires connection', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [{ condition: '${x}', target: 'sender' }],  // Component named "sender"
                    defaultRoute: { target: 'groovy1' }
                }
            },
            {
                id: 'sender',  // Component with canonical ID "sender"
                type: 'GroovyScript' as const,
                config: { name: 'Sender Script', scriptName: 'sender.groovy' }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'sender' },  // Connection to component named "sender"
            { from: 'router1', to: 'groovy1' }
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
});

runTest('7. Mixed component route + receiver endpoint => PASS', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [
                        { condition: '${header.type} == "A"', target: 'groovy1' },
                        { condition: '${header.type} == "B"', target: 'groovy2' }
                    ],
                    defaultRoute: { target: 'receiver' }  // Flow adapter
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            },
            {
                id: 'groovy2',
                type: 'GroovyScript' as const,
                config: { name: 'Script 2', scriptName: 'script2.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'groovy1' },
            { from: 'router1', to: 'groovy2' }
            // NO connection to 'receiver' - it's a flow adapter
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
});

runTest('8. Existing Router + Groovy + Mapping + HTTP/HTTPS flow => PASS', () => {
    const json = {
        name: 'Complex Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/api/orders' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://api.backend.com/orders', method: 'POST' } },
        components: [
            {
                id: 'contentModifier1',
                type: 'ContentModifier' as const,
                config: {
                    name: 'Set Headers',
                    headers: { Country: 'IN' }
                }
            },
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Route by Type',
                    routes: [{ condition: '${header.type} == "urgent"', target: 'groovy1' }],
                    defaultRoute: { target: 'mapping1' }
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Transform Urgent', scriptName: 'transform.groovy' }
            },
            {
                id: 'mapping1',
                type: 'MessageMapping' as const,
                config: { name: 'Map Standard', mappingName: 'OrderMapping' }
            }
        ],
        connections: [
            { from: 'contentModifier1', to: 'router1' },
            { from: 'router1', to: 'groovy1' },
            { from: 'router1', to: 'mapping1' }
        ],
        resources: [
            { type: 'groovy' as const, name: 'transform.groovy', content: 'def Message processData(Message message) { return message; }' },
            { type: 'mapping' as const, name: 'OrderMapping.mmap', content: '<mapping/>' }
        ]
    };

    const flow = fromJson(json);
    const result = validate(flow);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
});

runTest('9. Unknown target → existing validation behavior (passes validation, fails at connection building)', () => {
    const json = {
        name: 'Test Flow',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'router1',
                type: 'Router' as const,
                config: {
                    name: 'Test Router',
                    routes: [{ condition: '${x}', target: 'invalidTypo' }],
                    defaultRoute: { target: 'groovy1' }
                }
            },
            {
                id: 'groovy1',
                type: 'GroovyScript' as const,
                config: { name: 'Script 1', scriptName: 'script1.groovy' }
            }
        ],
        connections: [
            { from: 'router1', to: 'groovy1' }
            // No connection to 'invalidTypo' - it's unknown
        ]
    };

    // Note: Unknown targets pass RT-003 validation
    // They will fail during connection building when fromJson tries to resolve them
    const flow = fromJson(json);
    const result = validate(flow);

    // RT-003 should not fire for unknown targets (they're handled elsewhere)
    expect(result.errors.filter(e => e.code === 'RT-003')).toHaveLength(0);
});

console.log(`\n=== Test Results ===`);
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}\n`);

if (failCount > 0) {
    process.exit(1);
}
