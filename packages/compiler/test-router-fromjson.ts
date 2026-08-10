/**
 * Test Router validation with fromJson factory
 *
 * This tests the complete AI JSON workflow:
 * 1. AI generates JSON with Router component
 * 2. JSON includes routes configuration
 * 3. JSON includes connections from router to targets
 * 4. Validation passes/fails based on routes vs connections match
 */

import { fromJson, validate, compileToZip, Router } from './src/index';
import type { IFlowJson } from './src/index';

console.log('\n=== Router fromJson Validation Tests ===\n');

// Test 1: Valid Router with 2 routes + 2 connections
console.log('Test 1: Valid Router JSON (2 routes + 2 connections)');
const validRouterJson: IFlowJson = {
    name: 'ValidRouterFlow',
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
                name: 'Route by Type',
                routes: [
                    { condition: "${header.type} == 'A'", target: 'handlerA' }
                ],
                defaultRoute: { target: 'handlerB' }
            }
        },
        {
            id: 'handlerA',
            type: 'ContentModifier',
            config: { name: 'Handler A' }
        },
        {
            id: 'handlerB',
            type: 'ContentModifier',
            config: { name: 'Handler B' }
        }
    ],
    connections: [
        { from: 'router1', to: 'handlerA' },
        { from: 'router1', to: 'handlerB' }
    ]
};

try {
    const validFlow = fromJson(validRouterJson);
    const validResult = validate(validFlow);

    const router = validFlow.getComponents().find(c => c instanceof Router) as Router;
    console.log('  Routes:', router?.getAllRoutes().length);
    console.log('  Connections from router:', validFlow.getConnections().filter(c => c.from.id.includes('Gateway')).length);
    console.log('  Valid:', validResult.valid);

    if (!validResult.valid) {
        console.error('  ❌ FAILED - Expected valid but got errors:', validResult.errors);
        process.exit(1);
    }

    console.log('  ✅ PASSED - Router with matching routes and connections validates successfully');
} catch (error) {
    console.error('  ❌ FAILED with exception:', error instanceof Error ? error.message : error);
    process.exit(1);
}

// Test 2: Invalid Router with 2 routes + 1 connection (RT-003)
console.log('\nTest 2: Invalid Router JSON (2 routes + 1 connection - RT-003 expected)');
const invalidRouterJson: IFlowJson = {
    name: 'InvalidRouterFlow',
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
            id: 'router2',
            type: 'Router',
            config: {
                name: 'Route by Type',
                routes: [
                    { condition: "${header.type} == 'A'", target: 'handlerC' }
                ],
                defaultRoute: { target: 'handlerD' }
            }
        },
        {
            id: 'handlerC',
            type: 'ContentModifier',
            config: { name: 'Handler C' }
        },
        {
            id: 'handlerD',
            type: 'ContentModifier',
            config: { name: 'Handler D' }
        }
    ],
    connections: [
        // ONLY ONE connection - missing the second!
        { from: 'router2', to: 'handlerC' }
    ]
};

try {
    const invalidFlow = fromJson(invalidRouterJson);
    const invalidResult = validate(invalidFlow);

    const router2 = invalidFlow.getComponents().find(c => c instanceof Router) as Router;
    console.log('  Routes:', router2?.getAllRoutes().length);
    console.log('  Connections from router:', invalidFlow.getConnections().filter(c => c.from.id.includes('Gateway')).length);
    console.log('  Valid:', invalidResult.valid);

    if (invalidResult.valid) {
        console.error('  ❌ FAILED - Expected RT-003 error but validation passed');
        process.exit(1);
    }

    const rt003Error = invalidResult.errors.find(e => e.code === 'RT-003');
    if (!rt003Error) {
        console.error('  ❌ FAILED - Expected RT-003 error but got:', invalidResult.errors);
        process.exit(1);
    }

    console.log('  Error:', rt003Error.code, '-', rt003Error.message);
    console.log('  ✅ PASSED - RT-003 validation correctly detects missing connection');
} catch (error) {
    console.error('  ❌ FAILED with exception:', error instanceof Error ? error.message : error);
    process.exit(1);
}

// Test 3: Valid Router with 3 routes + 3 connections
console.log('\nTest 3: Valid Router JSON (3 routes + 3 connections)');
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
            id: 'router3',
            type: 'Router',
            config: {
                name: 'Route by Priority',
                routes: [
                    { condition: "${header.priority} == 'high'", target: 'highHandler' },
                    { condition: "${header.priority} == 'medium'", target: 'mediumHandler' }
                ],
                defaultRoute: { target: 'lowHandler' }
            }
        },
        {
            id: 'highHandler',
            type: 'ContentModifier',
            config: { name: 'High Priority Handler' }
        },
        {
            id: 'mediumHandler',
            type: 'ContentModifier',
            config: { name: 'Medium Priority Handler' }
        },
        {
            id: 'lowHandler',
            type: 'ContentModifier',
            config: { name: 'Low Priority Handler' }
        }
    ],
    connections: [
        { from: 'router3', to: 'highHandler' },
        { from: 'router3', to: 'mediumHandler' },
        { from: 'router3', to: 'lowHandler' }
    ]
};

try {
    const threeRouteFlow = fromJson(threeRouteJson);
    const threeRouteResult = validate(threeRouteFlow);

    const router3 = threeRouteFlow.getComponents().find(c => c instanceof Router) as Router;
    console.log('  Routes:', router3?.getAllRoutes().length);
    console.log('  Connections from router:', threeRouteFlow.getConnections().filter(c => c.from.id.includes('Gateway')).length);
    console.log('  Valid:', threeRouteResult.valid);

    if (!threeRouteResult.valid) {
        console.error('  ❌ FAILED - Expected valid but got errors:', threeRouteResult.errors);
        process.exit(1);
    }

    console.log('  ✅ PASSED - Router with 3 routes and 3 connections validates successfully');
} catch (error) {
    console.error('  ❌ FAILED with exception:', error instanceof Error ? error.message : error);
    process.exit(1);
}

// Test 4: Verify valid router can compile to ZIP
console.log('\nTest 4: Compile valid Router to ZIP');

async function testCompile() {
    const validFlow = fromJson(validRouterJson);
    const zipBuffer = await compileToZip(validFlow);

    if (!zipBuffer || zipBuffer.length === 0) {
        console.error('  ❌ FAILED - ZIP buffer is empty');
        process.exit(1);
    }

    console.log('  ZIP size:', zipBuffer.length, 'bytes');
    console.log('  ✅ PASSED - Valid Router compiles to ZIP successfully');
}

testCompile().catch(error => {
    console.error('  ❌ FAILED with exception:', error instanceof Error ? error.message : error);
    process.exit(1);
});

console.log('\n=== All Router Validation Tests Passed ===\n');
console.log('Summary:');
console.log('  ✓ Router with matching routes and connections validates');
console.log('  ✓ Router with mismatched routes and connections fails RT-003');
console.log('  ✓ RT-003 validation not weakened');
console.log('  ✓ Valid Router compiles to ZIP');
console.log('  ✓ fromJson factory correctly processes Router configuration');
