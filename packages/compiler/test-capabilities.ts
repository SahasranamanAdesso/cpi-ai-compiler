/**
 * Test capabilities API
 */

import { getCapabilities } from './src/index';

console.log('\n=== Testing Capabilities API ===\n');

const capabilities = getCapabilities();

console.log('Components:', capabilities.components.length);
console.log('Adapters:', capabilities.adapters.length);
console.log('Resources:', capabilities.resources);

// Test GroovyScript has scriptName as required
console.log('\n=== GroovyScript Validation ===');
const groovyScript = capabilities.components.find(c => c.type === 'GroovyScript');

if (!groovyScript) {
    console.error('❌ GroovyScript not found in capabilities!');
    process.exit(1);
}

console.log('Display Name:', groovyScript.displayName);
console.log('Required Properties:', groovyScript.requiredProperties);
console.log('Optional Properties:', Object.keys(groovyScript.optionalProperties));

if (!groovyScript.requiredProperties.includes('scriptName')) {
    console.error('❌ GroovyScript does not list scriptName as required!');
    process.exit(1);
}

console.log('✓ GroovyScript correctly reports scriptName as required');

// Test ContentModifier
console.log('\n=== ContentModifier Validation ===');
const contentModifier = capabilities.components.find(c => c.type === 'ContentModifier');

if (!contentModifier) {
    console.error('❌ ContentModifier not found in capabilities!');
    process.exit(1);
}

console.log('Display Name:', contentModifier.displayName);
console.log('Required Properties:', contentModifier.requiredProperties);
console.log('Example:', JSON.stringify(contentModifier.example, null, 2));

// Test HTTPS Sender
console.log('\n=== HTTPS Sender Validation ===');
const httpsSender = capabilities.adapters.find(a => a.type === 'HTTPS' && a.direction === 'Sender');

if (!httpsSender) {
    console.error('❌ HTTPS Sender not found in capabilities!');
    process.exit(1);
}

console.log('Display Name:', httpsSender.displayName);
console.log('Required Properties:', httpsSender.requiredProperties);
console.log('Example:', JSON.stringify(httpsSender.example, null, 2));

if (!httpsSender.requiredProperties.includes('address')) {
    console.error('❌ HTTPS Sender does not list address as required!');
    process.exit(1);
}

console.log('✓ HTTPS Sender correctly reports address as required');

// Verify all component types are present
console.log('\n=== Component Coverage ===');
const expectedComponents = [
    'ContentModifier', 'Router', 'GroovyScript', 'DataStore',
    'Multicast', 'Splitter', 'Gather', 'MessageMapping',
    'XmlValidator', 'XsltMapping', 'ProcessCall'
];

for (const expected of expectedComponents) {
    const found = capabilities.components.find(c => c.type === expected);
    if (!found) {
        console.error(`❌ Missing component: ${expected}`);
        process.exit(1);
    }
    console.log(`✓ ${expected}`);
}

// Verify all adapter types are present
console.log('\n=== Adapter Coverage ===');
const expectedAdapters = [
    'HTTP', 'HTTPS', 'OData', 'SFTP', 'SOAP', 'IDoc'
];

for (const expected of expectedAdapters) {
    const senderFound = capabilities.adapters.find(a => a.type === expected && a.direction === 'Sender');
    const receiverFound = capabilities.adapters.find(a => a.type === expected && a.direction === 'Receiver');

    if (!senderFound || !receiverFound) {
        console.error(`❌ Missing adapter: ${expected} (Sender: ${!!senderFound}, Receiver: ${!!receiverFound})`);
        process.exit(1);
    }
    console.log(`✓ ${expected} (Sender & Receiver)`);
}

console.log('\n✅ ALL CAPABILITIES TESTS PASSED\n');
