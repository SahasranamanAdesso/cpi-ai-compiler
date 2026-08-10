/**
 * Test Router capabilities exposure
 */

import { getCapabilities } from './src/index';

console.log('\n=== Router Capabilities Test ===\n');

const capabilities = getCapabilities();
const routerCapability = capabilities.components.find(c => c.type === 'Router');

if (!routerCapability) {
    console.error('❌ Router not found in capabilities!');
    process.exit(1);
}

console.log('Router Capability:');
console.log('  Display Name:', routerCapability.displayName);
console.log('  Required Properties:', routerCapability.requiredProperties);
console.log('  Optional Properties:', Object.keys(routerCapability.optionalProperties));
console.log('\n  Example:', JSON.stringify(routerCapability.example, null, 4));
console.log('\n  Notes:', routerCapability.notes);

// Verify the notes mention connections
if (!routerCapability.notes) {
    console.error('\n❌ Router capability missing notes!');
    process.exit(1);
}

if (!routerCapability.notes.includes('connection')) {
    console.error('\n❌ Router notes do not mention connections!');
    process.exit(1);
}

if (!routerCapability.notes.includes('RT-003')) {
    console.error('\n❌ Router notes do not mention RT-003 validation!');
    process.exit(1);
}

// Verify example has multiple routes
const example = routerCapability.example;
if (!example || !example.routes || !Array.isArray(example.routes) || example.routes.length < 2) {
    console.error('\n❌ Router example does not show at least 2 routes!');
    process.exit(1);
}

// Verify example routes have target property
for (const route of example.routes) {
    if (!route.target) {
        console.error('\n❌ Router example route missing target property!');
        process.exit(1);
    }
}

// Verify defaultRoute has target
if (!example.defaultRoute || !example.defaultRoute.target) {
    console.error('\n❌ Router example defaultRoute missing target property!');
    process.exit(1);
}

console.log('\n✅ Router capability correctly exposes:');
console.log('   ✓ Routes configuration with condition and target');
console.log('   ✓ Example with 2 conditional routes + 1 default route');
console.log('   ✓ Notes explaining connection requirement');
console.log('   ✓ Notes explaining RT-003 validation');
console.log('   ✓ Minimum route requirement (2 routes)');
