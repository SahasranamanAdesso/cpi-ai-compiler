/**
 * Regression test for RT-003 bug fix
 *
 * BUG: Connections to components named "receiver" were incorrectly skipped
 * because ComponentFactory.fromJson() had:
 *   if (conn.to === 'receiver') { continue; }
 *
 * This caused RT-003 validation errors when Router routes targeted a
 * component with id="receiver" (not the flow's receiver adapter).
 *
 * FIX: Only skip "receiver" connections when "receiver" is NOT in componentMap
 * (i.e., when it refers to the implicit flow adapter, not a user component).
 */

import { fromJson, validate, Router } from './src/index';
import type { IFlowJson } from './src/index';

console.log('\n=== RT-003 Bug Fix: Component Named "receiver" ===\n');

// Test 1: Router with route to component named "receiver"
console.log('Test 1: Router with component id="receiver" (bug scenario)');

const bugScenarioJson: IFlowJson = {
    name: 'ReceiverComponentTest',
    sender: {
        type: 'HTTPS',
        config: { address: '/api/orders' }
    },
    receiver: {
        type: 'HTTPS',
        config: { url: 'https://backend.example.com' }
    },
    components: [
        {
            id: 'router1',
            type: 'Router',
            config: {
                name: 'Route Orders',
                routes: [
                    { condition: "${header.type} == 'express'", target: 'handler' }
                ],
                defaultRoute: { target: 'receiver' }  // ← Component named "receiver"
            }
        },
        {
            id: 'handler',
            type: 'ContentModifier',
            config: { name: 'Express Handler' }
        },
        {
            id: 'receiver',  // ← This is a COMPONENT, not the flow's receiver adapter
            type: 'ContentModifier',
            config: { name: 'Standard Handler' }
        }
    ],
    connections: [
        { from: 'router1', to: 'handler' },
        { from: 'router1', to: 'receiver' }  // ← This MUST NOT be skipped
    ]
};

const flow1 = fromJson(bugScenarioJson);
const router1 = flow1.getComponents().find(c => c instanceof Router) as Router;
const result1 = validate(flow1);

console.log('  Router routes:', router1.getAllRoutes().length);
console.log('  Router connections:', flow1.getConnections().filter(c => c.from === router1).length);
console.log('  Valid:', result1.valid);

if (!result1.valid) {
    console.error('  ❌ FAILED - Validation should pass');
    console.error('  Errors:', result1.errors.map(e => `${e.code}: ${e.message}`));
    process.exit(1);
}

const rt003Error = result1.errors.find(e => e.code === 'RT-003');
if (rt003Error) {
    console.error('  ❌ FAILED - RT-003 error should not occur');
    console.error('  Error:', rt003Error.message);
    process.exit(1);
}

if (router1.getAllRoutes().length !== 2) {
    console.error('  ❌ FAILED - Router should have 2 routes');
    process.exit(1);
}

const routerConnections = flow1.getConnections().filter(c => c.from === router1);
if (routerConnections.length !== 2) {
    console.error('  ❌ FAILED - Router should have 2 connections');
    console.error('  Expected: 2, Got:', routerConnections.length);
    process.exit(1);
}

console.log('  ✅ PASSED - Component named "receiver" works correctly\n');

// Test 2: Normal flow with implicit sender/receiver (should still work)
console.log('Test 2: Normal flow with implicit sender/receiver connections');

const normalFlowJson: IFlowJson = {
    name: 'NormalFlow',
    sender: {
        type: 'HTTPS',
        config: { address: '/api/data' }
    },
    receiver: {
        type: 'HTTPS',
        config: { url: 'https://target.example.com' }
    },
    components: [
        {
            id: 'processor',
            type: 'ContentModifier',
            config: { name: 'Process Data' }
        }
    ],
    connections: [
        { from: 'sender', to: 'processor' },    // ← Should be skipped (implicit)
        { from: 'processor', to: 'receiver' }   // ← Should be skipped (implicit)
    ]
};

const flow2 = fromJson(normalFlowJson);
const result2 = validate(flow2);

console.log('  Valid:', result2.valid);
console.log('  Explicit connections:', flow2.getConnections().length);

if (!result2.valid) {
    console.error('  ❌ FAILED - Normal flow should validate');
    console.error('  Errors:', result2.errors.map(e => `${e.code}: ${e.message}`));
    process.exit(1);
}

// Verify that implicit connections were skipped (not added to connections list)
if (flow2.getConnections().length > 0) {
    console.error('  ❌ FAILED - Implicit sender/receiver connections should be skipped');
    console.error('  Expected 0 explicit connections, got:', flow2.getConnections().length);
    process.exit(1);
}

console.log('  ✅ PASSED - Implicit sender/receiver connections skipped correctly\n');

// Test 3: Router with 3 routes, one to "receiver" component
console.log('Test 3: Router with 3 routes including "receiver" component');

const threeRouteJson: IFlowJson = {
    name: 'ThreeRouteFlow',
    sender: {
        type: 'HTTPS',
        config: { address: '/api/orders' }
    },
    receiver: {
        type: 'HTTPS',
        config: { url: 'https://backend.example.com' }
    },
    components: [
        {
            id: 'orderRouter',
            type: 'Router',
            config: {
                name: 'Route by Priority',
                routes: [
                    { condition: "${header.priority} == 'high'", target: 'highPriority' },
                    { condition: "${header.priority} == 'medium'", target: 'receiver' }  // ← Component
                ],
                defaultRoute: { target: 'lowPriority' }
            }
        },
        {
            id: 'highPriority',
            type: 'ContentModifier',
            config: { name: 'High Priority' }
        },
        {
            id: 'receiver',  // ← Component named "receiver"
            type: 'ContentModifier',
            config: { name: 'Medium Priority' }
        },
        {
            id: 'lowPriority',
            type: 'ContentModifier',
            config: { name: 'Low Priority' }
        }
    ],
    connections: [
        { from: 'orderRouter', to: 'highPriority' },
        { from: 'orderRouter', to: 'receiver' },     // ← Must NOT be skipped
        { from: 'orderRouter', to: 'lowPriority' }
    ]
};

const flow3 = fromJson(threeRouteJson);
const router3 = flow3.getComponents().find(c => c instanceof Router) as Router;
const result3 = validate(flow3);

console.log('  Router routes:', router3.getAllRoutes().length);
console.log('  Router connections:', flow3.getConnections().filter(c => c.from === router3).length);
console.log('  Valid:', result3.valid);

if (!result3.valid) {
    console.error('  ❌ FAILED - Validation should pass');
    console.error('  Errors:', result3.errors.map(e => `${e.code}: ${e.message}`));
    process.exit(1);
}

if (router3.getAllRoutes().length !== 3) {
    console.error('  ❌ FAILED - Router should have 3 routes');
    process.exit(1);
}

const router3Connections = flow3.getConnections().filter(c => c.from === router3);
if (router3Connections.length !== 3) {
    console.error('  ❌ FAILED - Router should have 3 connections');
    console.error('  Expected: 3, Got:', router3Connections.length);
    process.exit(1);
}

console.log('  ✅ PASSED - 3 routes with "receiver" component work correctly\n');

// Test 4: Component named "sender" (edge case)
console.log('Test 4: Component named "sender" (edge case)');

const senderComponentJson: IFlowJson = {
    name: 'SenderComponentTest',
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
            id: 'sender',  // ← Component named "sender"
            type: 'ContentModifier',
            config: { name: 'Sender Component' }
        },
        {
            id: 'processor',
            type: 'ContentModifier',
            config: { name: 'Processor' }
        }
    ],
    connections: [
        { from: 'sender', to: 'processor' }  // ← Should NOT be skipped
    ]
};

const flow4 = fromJson(senderComponentJson);
const result4 = validate(flow4);

console.log('  Valid:', result4.valid);
console.log('  Explicit connections:', flow4.getConnections().length);

if (!result4.valid) {
    console.error('  ❌ FAILED - Validation should pass');
    console.error('  Errors:', result4.errors.map(e => `${e.code}: ${e.message}`));
    process.exit(1);
}

if (flow4.getConnections().length !== 1) {
    console.error('  ❌ FAILED - Connection from component "sender" should be preserved');
    console.error('  Expected: 1, Got:', flow4.getConnections().length);
    process.exit(1);
}

console.log('  ✅ PASSED - Component named "sender" works correctly\n');

console.log('=== All RT-003 Bug Fix Tests Passed ===\n');
console.log('Summary:');
console.log('  ✓ Router with component id="receiver" validates');
console.log('  ✓ Both router connections preserved (not skipped)');
console.log('  ✓ RT-003 validation error does not occur');
console.log('  ✓ Implicit sender/receiver connections still skipped correctly');
console.log('  ✓ Normal flows continue to work as before');
console.log('  ✓ Component named "sender" also works');
