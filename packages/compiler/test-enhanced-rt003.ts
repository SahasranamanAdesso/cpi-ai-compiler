/**
 * Test enhanced RT-003 error message
 *
 * This demonstrates the improved error message that tells the AI
 * exactly which connections are missing and how to add them.
 */

import { fromJson, validate } from './src/index';
import type { IFlowJson } from './src/index';

console.log('\n=== Enhanced RT-003 Error Message Test ===\n');

// Scenario: Router with 2 routes but only 1 connection
const incompleteRouterJson: IFlowJson = {
    name: 'IncompleteRouterFlow',
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
                name: 'Route by Type',
                routes: [
                    { condition: "${header.orderType} == 'standard'", target: 'standardHandler' }
                ],
                defaultRoute: { target: 'expressHandler' }
            }
        },
        {
            id: 'standardHandler',
            type: 'ContentModifier',
            config: { name: 'Standard Order Handler' }
        },
        {
            id: 'expressHandler',
            type: 'ContentModifier',
            config: { name: 'Express Order Handler' }
        }
    ],
    connections: [
        // MISSING: Connection to expressHandler!
        { from: 'orderRouter', to: 'standardHandler' }
    ]
};

console.log('Testing Router with incomplete connections...\n');

const flow = fromJson(incompleteRouterJson);
const result = validate(flow);

console.log('Validation Result:', result.valid ? 'VALID' : 'INVALID');
console.log('\nErrors:');
result.errors.forEach(err => {
    console.log(`\n[${err.code}] ${err.message}`);
    if (err.component) {
        console.log(`Component: ${err.component}`);
    }
});

// Verify the error message is helpful
const rt003 = result.errors.find(e => e.code === 'RT-003');
if (!rt003) {
    console.error('\n❌ RT-003 error not found!');
    process.exit(1);
}

console.log('\n=== Error Message Analysis ===\n');

// Check that the error message includes key information
const checks = [
    { name: 'Mentions number of routes', test: /\d+ routes/.test(rt003.message) },
    { name: 'Mentions number of connections', test: /\d+ connections/.test(rt003.message) },
    { name: 'Lists missing target (expressHandler)', test: /expressHandler/.test(rt003.message) },
    { name: 'Shows how to add connections', test: /Add to connections array/.test(rt003.message) },
    { name: 'Provides JSON syntax', test: /\{"from":.*"to":/.test(rt003.message) }
];

let allPassed = true;
checks.forEach(check => {
    const status = check.test ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (!check.test) allPassed = false;
});

if (!allPassed) {
    console.error('\n❌ Enhanced error message missing key information!');
    process.exit(1);
}

console.log('\n✅ Enhanced RT-003 error message provides actionable guidance!');
console.log('\nThe AI can now:');
console.log('  1. See exactly which connections are missing');
console.log('  2. Know the router ID and target IDs');
console.log('  3. Get copy-pasteable JSON for the connections array');
console.log('  4. Understand the fix without trial-and-error');
