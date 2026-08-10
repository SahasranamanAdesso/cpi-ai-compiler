/**
 * Test Router with routes to flow adapters (sender/receiver endpoints)
 *
 * BUG: RT-003 validation counted routes to "receiver" adapter as needing connections
 * even though connections to adapters are implicit (not explicit in connections array).
 *
 * Example: Router with 2 routes:
 *   1. Route to "groovy1" (component) → needs connection
 *   2. DefaultRoute to "receiver" (adapter) → NO connection needed
 *
 * Previous validation: expected 2 connections (WRONG)
 * Fixed validation: expects 1 connection (only to components)
 */

import { fromJson, validate, Router } from './src/index';
import type { IFlowJson } from './src/index';

console.log('\n=== Router with Routes to Flow Adapters ===\n');

// Test 1: Router with route to component and defaultRoute to receiver adapter
console.log('Test 1: Router with defaultRoute to receiver adapter');

const routerToAdapterJson: IFlowJson = {
    name: 'OrderIntegrationDemo',
    sender: {
        type: 'HTTPS',
        config: { address: '/api/orders' }
    },
    components: [
        {
            id: 'cm1',
            type: 'ContentModifier',
            config: {
                name: 'Set Headers',
                headerTable: [
                    { name: 'Country', value: 'IN' },
                    { name: 'Source', value: 'API' }
                ]
            }
        },
        {
            id: 'router1',
            type: 'Router',
            config: {
                name: 'Route by Country',
                routes: [
                    { condition: "${header.Country} == 'IN'", target: 'groovy1' }
                ],
                defaultRoute: { target: 'receiver' }  // ← receiver is the ADAPTER, not a component
            }
        },
        {
            id: 'groovy1',
            type: 'GroovyScript',
            config: {
                name: 'ValidateOrder',
                scriptName: 'validateOrder.groovy'
            }
        }
    ],
    receiver: {
        type: 'HTTP',
        config: {
            url: 'https://example.com/orders',
            method: 'POST'
        }
    },
    connections: [
        { from: 'sender', to: 'cm1' },
        { from: 'cm1', to: 'router1' },
        { from: 'router1', to: 'groovy1' },        // ← Only this connection needed
        { from: 'router1', to: 'receiver' },       // ← This is skipped (implicit)
        { from: 'groovy1', to: 'receiver' }        // ← This is also skipped (implicit)
    ],
    resources: [
        {
            type: 'groovy',
            name: 'validateOrder.groovy',
            content: 'def message = exchange.getProperty("message"); return message;'
        }
    ]
};

const flow1 = fromJson(routerToAdapterJson);
const router1 = flow1.getComponents().find(c => c instanceof Router) as Router;
const result1 = validate(flow1);

console.log('  Router total routes:', router1.getAllRoutes().length);
console.log('  Router routes to components:', router1.getAllRoutes().filter(r => r.target && flow1.getComponents().some(c => c.id === r.target)).length);
console.log('  Router connections:', flow1.getConnections().filter(c => c.from === router1).length);
console.log('  Valid:', result1.valid);

if (!result1.valid) {
    console.error('  ❌ FAILED - Should validate successfully');
    console.error('  Errors:', result1.errors.map(e => `${e.code}: ${e.message}`));
    process.exit(1);
}

console.log('  ✅ PASSED - Router with route to adapter validates correctly\n');

// Test 2: Router with both routes to components (should need 2 connections)
console.log('Test 2: Router with both routes to components');

const bothComponentsJson: IFlowJson = {
    name: 'BothComponentsFlow',
    sender: {
        type: 'HTTPS',
        config: { address: '/api/test' }
    },
    receiver: {
        type: 'HTTPS',
        config: { url: 'https://example.com' }
    },
    components: [
        {
            id: 'router1',
            type: 'Router',
            config: {
                name: 'Test Router',
                routes: [
                    { condition: "${x} == 'a'", target: 'comp1' }
                ],
                defaultRoute: { target: 'comp2' }  // ← Both are components
            }
        },
        { id: 'comp1', type: 'ContentModifier', config: { name: 'Comp1' } },
        { id: 'comp2', type: 'ContentModifier', config: { name: 'Comp2' } }
    ],
    connections: [
        { from: 'router1', to: 'comp1' },
        { from: 'router1', to: 'comp2' }  // ← Both connections needed
    ]
};

const flow2 = fromJson(bothComponentsJson);
const router2 = flow2.getComponents().find(c => c instanceof Router) as Router;
const result2 = validate(flow2);

console.log('  Router routes to components:', router2.getAllRoutes().filter(r => r.target && flow2.getComponents().some(c => c.id === r.target)).length);
console.log('  Router connections:', flow2.getConnections().filter(c => c.from === router2).length);
console.log('  Valid:', result2.valid);

if (!result2.valid) {
    console.error('  ❌ FAILED - Should validate successfully');
    console.error('  Errors:', result2.errors.map(e => `${e.code}: ${e.message}`));
    process.exit(1);
}

console.log('  ✅ PASSED - Router with both routes to components validates\n');

// Test 3: Router with missing connection to component (should fail)
console.log('Test 3: Router with missing connection to component (RT-003 expected)');

const missingConnectionJson: IFlowJson = {
    name: 'MissingConnectionFlow',
    sender: {
        type: 'HTTPS',
        config: { address: '/api/test' }
    },
    receiver: {
        type: 'HTTPS',
        config: { url: 'https://example.com' }
    },
    components: [
        {
            id: 'router1',
            type: 'Router',
            config: {
                name: 'Test Router',
                routes: [
                    { condition: "${x} == 'a'", target: 'comp1' }
                ],
                defaultRoute: { target: 'comp2' }
            }
        },
        { id: 'comp1', type: 'ContentModifier', config: { name: 'Comp1' } },
        { id: 'comp2', type: 'ContentModifier', config: { name: 'Comp2' } }
    ],
    connections: [
        { from: 'router1', to: 'comp1' }
        // Missing connection to comp2!
    ]
};

const flow3 = fromJson(missingConnectionJson);
const result3 = validate(flow3);

console.log('  Valid:', result3.valid);

if (result3.valid) {
    console.error('  ❌ FAILED - Should fail RT-003 validation');
    process.exit(1);
}

const rt003 = result3.errors.find(e => e.code === 'RT-003');
if (!rt003) {
    console.error('  ❌ FAILED - Should produce RT-003 error');
    console.error('  Errors:', result3.errors);
    process.exit(1);
}

console.log('  RT-003 Error:', rt003.message);
console.log('  ✅ PASSED - Missing connection correctly detected\n');

console.log('=== All Router-to-Adapter Tests Passed ===\n');
console.log('Summary:');
console.log('  ✓ Router with route to adapter validates (connection not required)');
console.log('  ✓ Router with routes to components validates (connections required)');
console.log('  ✓ RT-003 validation only counts routes to components');
console.log('  ✓ Routes to sender/receiver adapters excluded from count');
