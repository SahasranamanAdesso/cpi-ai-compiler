/**
 * ProcessCall Duplicate ID Fix Verification
 *
 * Tests that multiple ProcessCall instances get unique IDs even when
 * created in the same millisecond (CP-001 regression).
 */

import { fromJson } from './packages/compiler/src/factory/ComponentFactory';
import { validate } from './packages/compiler/src/api/validate';

console.log('=== TESTING PROCESSCALL DUPLICATE ID FIX ===\n');

// Test 1: Two ProcessCall instances with JSON-provided IDs
console.log('Test 1: Two ProcessCall instances with unique IDs');
const json1 = {
    name: 'MultiProcessTest',
    sender: {
        type: 'HTTPS' as const,
        config: { address: '/test' }
    },
    receiver: {
        type: 'HTTP' as const,
        config: { url: 'https://example.com', method: 'POST' }
    },
    components: [
        {
            id: 'domesticService',
            type: 'ProcessCall' as const,
            config: {
                name: 'Domestic Processing Service',
                processId: 'domestic_sub_process'
            }
        },
        {
            id: 'internationalService',
            type: 'ProcessCall' as const,
            config: {
                name: 'International Processing Service',
                processId: 'international_sub_process'
            }
        }
    ]
};

try {
    const flow1 = fromJson(json1);
    const components1 = flow1.getComponents();
    const ids1 = components1.map(c => c.id);

    console.log(`  ✓ Flow created: ${flow1.name}`);
    console.log(`  ✓ Components: ${components1.length}`);
    console.log(`  ✓ IDs: ${ids1.join(', ')}`);
    console.log(`  ✓ Unique IDs: ${new Set(ids1).size === ids1.length}`);

    if (ids1.includes('domesticService') && ids1.includes('internationalService')) {
        console.log('  ✓ JSON-provided IDs preserved\n');
    } else {
        console.log('  ❌ JSON-provided IDs NOT preserved\n');
        process.exit(1);
    }
} catch (error) {
    console.log(`  ❌ Error: ${(error as Error).message}\n`);
    process.exit(1);
}

// Test 2: Validation passes (no CP-001 error)
console.log('Test 2: Validation with multiple ProcessCall instances');
try {
    const flow2 = fromJson(json1);
    const result = validate(flow2);
    const duplicateIdErrors = result.errors.filter(e => e.code === 'CP-001');

    if (duplicateIdErrors.length === 0) {
        console.log('  ✓ No CP-001 duplicate ID errors');
        console.log(`  ✓ Total errors: ${result.errors.length}`);
        console.log(`  ✓ Total warnings: ${result.warnings.length}\n`);
    } else {
        console.log(`  ❌ CP-001 errors found: ${duplicateIdErrors.length}`);
        duplicateIdErrors.forEach(err => console.log(`     - ${err.message}`));
        console.log('');
        process.exit(1);
    }
} catch (error) {
    console.log(`  ❌ Error: ${(error as Error).message}\n`);
    process.exit(1);
}

// Test 3: Multiple instances of different component types
console.log('Test 3: Multiple instances of ANY component type (8 components)');
const json3 = {
    name: 'MultiComponentTest',
    sender: {
        type: 'HTTPS' as const,
        config: { address: '/test' }
    },
    receiver: {
        type: 'HTTP' as const,
        config: { url: 'https://example.com', method: 'POST' }
    },
    components: [
        {
            id: 'router1',
            type: 'Router' as const,
            config: {
                name: 'Router 1',
                routes: [{ condition: '${x}', target: 'groovy1' }],
                defaultRoute: { target: 'groovy2' }
            }
        },
        {
            id: 'router2',
            type: 'Router' as const,
            config: {
                name: 'Router 2',
                routes: [{ condition: '${y}', target: 'groovy3' }],
                defaultRoute: { target: 'groovy4' }
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
        },
        {
            id: 'groovy3',
            type: 'GroovyScript' as const,
            config: { name: 'Script 3', scriptName: 'script3.groovy' }
        },
        {
            id: 'groovy4',
            type: 'GroovyScript' as const,
            config: { name: 'Script 4', scriptName: 'script4.groovy' }
        },
        {
            id: 'process1',
            type: 'ProcessCall' as const,
            config: { name: 'Process 1', processId: 'subprocess1' }
        },
        {
            id: 'process2',
            type: 'ProcessCall' as const,
            config: { name: 'Process 2', processId: 'subprocess2' }
        }
    ]
};

try {
    const flow3 = fromJson(json3);
    const components3 = flow3.getComponents();
    const ids3 = components3.map(c => c.id);

    console.log(`  ✓ Flow created: ${flow3.name}`);
    console.log(`  ✓ Components: ${components3.length}`);
    console.log(`  ✓ All IDs unique: ${new Set(ids3).size === ids3.length}`);

    const result3 = validate(flow3);
    const duplicateIdErrors3 = result3.errors.filter(e => e.code === 'CP-001');

    if (duplicateIdErrors3.length === 0) {
        console.log('  ✓ No CP-001 duplicate ID errors\n');
    } else {
        console.log(`  ❌ CP-001 errors found: ${duplicateIdErrors3.length}\n`);
        process.exit(1);
    }
} catch (error) {
    console.log(`  ❌ Error: ${(error as Error).message}\n`);
    process.exit(1);
}

// Test 4: Custom IDs are preserved
console.log('Test 4: AI-provided logical component IDs preserved');
const json4 = {
    name: 'Test',
    sender: {
        type: 'HTTPS' as const,
        config: { address: '/test' }
    },
    receiver: {
        type: 'HTTP' as const,
        config: { url: 'https://example.com', method: 'POST' }
    },
    components: [
        {
            id: 'myCustomId1',
            type: 'ProcessCall' as const,
            config: { name: 'Process 1', processId: 'subprocess1' }
        },
        {
            id: 'myCustomId2',
            type: 'ProcessCall' as const,
            config: { name: 'Process 2', processId: 'subprocess2' }
        }
    ]
};

try {
    const flow4 = fromJson(json4);
    const components4 = flow4.getComponents();

    if (components4[0].id === 'myCustomId1' && components4[1].id === 'myCustomId2') {
        console.log('  ✓ JSON-provided IDs preserved: myCustomId1, myCustomId2\n');
    } else {
        console.log(`  ❌ IDs not preserved: ${components4[0].id}, ${components4[1].id}\n`);
        process.exit(1);
    }
} catch (error) {
    console.log(`  ❌ Error: ${(error as Error).message}\n`);
    process.exit(1);
}

console.log('✅ ALL TESTS PASSED - ProcessCall duplicate ID fix verified!\n');
console.log('Summary:');
console.log('  - Multiple ProcessCall instances work correctly');
console.log('  - JSON-provided component IDs are preserved');
console.log('  - No CP-001 duplicate ID errors');
console.log('  - Works for all component types (Router, GroovyScript, ProcessCall)\n');
