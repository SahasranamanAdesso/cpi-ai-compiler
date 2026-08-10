/**
 * Test Router validation - understand routes vs connections
 */

import { IFlow, Router, Component, HttpAdapter, validate } from './src/index';

console.log('\n=== Understanding Router Routes vs Connections ===\n');

// Test Case 1: Router with 2 routes and 2 connections (SHOULD PASS)
console.log('Test 1: Router with 2 routes + 2 connections (expected: PASS)');
const flow1 = new IFlow('RouterTest1');
flow1.setSender(HttpAdapter.sender({ address: '/test' }));
flow1.setReceiver(HttpAdapter.receiver({ url: 'https://example.com' }));

const router1 = new Router('Route by Type');
const compA = new Component('compA', 'Handler A', 'Enricher', {});
const compB = new Component('compB', 'Handler B', 'Enricher', {});

router1
    .when("${header.type} == 'A'")
    .to(compA)
    .otherwise()
    .to(compB);

flow1.addComponent(router1);
flow1.addComponent(compA);
flow1.addComponent(compB);

// Add connections from router to targets
flow1.connect(router1, compA);
flow1.connect(router1, compB);

const result1 = validate(flow1);
console.log('Routes:', router1.getAllRoutes().length);
console.log('Connections from router:', flow1.getConnections().filter(c => c.from.id === router1.id).length);
console.log('Valid:', result1.valid);
if (!result1.valid) {
    console.log('Errors:', result1.errors);
}

// Test Case 2: Router with 2 routes and 1 connection (SHOULD FAIL RT-003)
console.log('\nTest 2: Router with 2 routes + 1 connection (expected: RT-003 error)');
const flow2 = new IFlow('RouterTest2');
flow2.setSender(HttpAdapter.sender({ address: '/test' }));
flow2.setReceiver(HttpAdapter.receiver({ url: 'https://example.com' }));

const router2 = new Router('Route by Type');
const compC = new Component('compC', 'Handler C', 'Enricher', {});
const compD = new Component('compD', 'Handler D', 'Enricher', {});

router2
    .when("${header.type} == 'A'")
    .to(compC)
    .otherwise()
    .to(compD);

flow2.addComponent(router2);
flow2.addComponent(compC);
flow2.addComponent(compD);

// Only add ONE connection (missing the second)
flow2.connect(router2, compC);

const result2 = validate(flow2);
console.log('Routes:', router2.getAllRoutes().length);
console.log('Connections from router:', flow2.getConnections().filter(c => c.from.id === router2.id).length);
console.log('Valid:', result2.valid);
if (!result2.valid) {
    console.log('Errors:', result2.errors.map(e => `${e.code}: ${e.message}`));
}

// Test Case 3: Inspect Router route structure
console.log('\nTest 3: Router route structure');
console.log('Routes:', JSON.stringify(router1.getAllRoutes(), null, 2));

console.log('\n=== Summary ===');
console.log('✓ Router stores routes internally with condition + target');
console.log('✓ IFlow stores connections separately');
console.log('✓ Validation RT-003 checks: connections.length === routes.length');
console.log('✓ Each route MUST have a corresponding connection from router.id to route.target');
