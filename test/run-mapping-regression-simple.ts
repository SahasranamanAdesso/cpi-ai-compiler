/**
 * MessageMapping Regression Test - Simple version without ZIP extraction
 * Verifies MessageMapping component properties are correct
 */

import { fromJson } from '../packages/compiler/src/factory/ComponentFactory';

let passCount = 0;
let failCount = 0;

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
        toBeUndefined: () => {
            if (actual !== undefined) {
                throw new Error(`Expected undefined, got ${actual}`);
            }
        }
    };
}

console.log('\n=== MessageMapping Regression Tests ===\n');

runTest('Component properties should NOT include camelCase mappingName', () => {
    const json = {
        name: 'MappingTest',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'mapping1',
                type: 'MessageMapping' as const,
                config: {
                    name: 'Transform',
                    mappingName: 'OrderToInvoice.mmap'
                }
            }
        ]
    };

    const flow = fromJson(json);
    const mapping: any = flow.getComponents()[0];

    // Verify correct properties exist
    expect(mapping.properties.mappingType).toBe('MessageMapping');
    expect(mapping.properties.mappingReference).toBe('static');
    expect(mapping.properties.mappingname).toBe('OrderToInvoice');
    expect(mapping.properties.mappingpath).toBe('src/main/resources/mapping/OrderToInvoice');
    expect(mapping.properties.mappinguri).toBe('dir://mmap/src/main/resources/mapping/OrderToInvoice.mmap');

    // REGRESSION CHECK: Verify INCORRECT camelCase property does NOT exist
    // This was the bug - config.mappingName was being spread into component properties
    expect(mapping.properties.mappingName).toBeUndefined();
});

runTest('Dynamic mapping should work without duplicate property', () => {
    const json = {
        name: 'DynamicMappingTest',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'mapping1',
                type: 'MessageMapping' as const,
                config: {
                    name: 'Dynamic Transform',
                    mappingName: 'Dynamic.mmap',
                    mappingReference: 'dynamic',
                    mappingSourceValue: '${header.mappingName}'
                }
            }
        ]
    };

    const flow = fromJson(json);
    const mapping: any = flow.getComponents()[0];

    expect(mapping.properties.mappingReference).toBe('dynamic');
    expect(mapping.properties.mappingSourceValue).toBe('${header.mappingName}');

    // Still should not have camelCase mappingName
    expect(mapping.properties.mappingName).toBeUndefined();
});

runTest('Additional properties should be preserved (except mappingName)', () => {
    const json = {
        name: 'Test',
        sender: { type: 'HTTPS' as const, config: { address: '/test' } },
        receiver: { type: 'HTTP' as const, config: { url: 'https://example.com', method: 'POST' } },
        components: [
            {
                id: 'mapping1',
                type: 'MessageMapping' as const,
                config: {
                    name: 'Transform',
                    mappingName: 'Test.mmap',
                    customProp: 'customValue'
                }
            }
        ]
    };

    const flow = fromJson(json);
    const mapping: any = flow.getComponents()[0];

    // Custom property should be preserved
    expect(mapping.properties.customProp).toBe('customValue');

    // But mappingName should still be filtered out
    expect(mapping.properties.mappingName).toBeUndefined();
});

console.log(`\n=== Test Results ===`);
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}\n`);

if (failCount > 0) {
    process.exit(1);
}
