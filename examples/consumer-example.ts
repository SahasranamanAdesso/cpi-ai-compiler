/**
 * Consumer Example - How to use the @cpi-ai/compiler package
 *
 * This example demonstrates how another project would use the compiler as a
 * reusable npm package.
 *
 * Installation:
 *   npm install @cpi-ai/compiler
 *   or
 *   npm install file:../path/to/packages/compiler
 *   or
 *   npm install git+https://github.com/SahasranamanAdesso/cpi-ai_compiler.git
 */

import * as fs from 'fs';

// ============================================================================
// PRIMARY API - 4 Core Functions
// ============================================================================

import {
    // Core compiler functions
    compileToZip,
    compile,
    validate,
    supportedComponents,

    // Model classes for building flows
    IFlow,
    HttpAdapter,
    Component

} from '@cpi-ai/compiler';

/**
 * Example 1: Simple HTTP-to-HTTP flow using the minimal API
 */
async function example1_MinimalAPI() {
    console.log('\n=== Example 1: Minimal API ===');

    // 1. Create flow
    const flow = new IFlow('OrderProcessing');

    // 2. Configure sender and receiver
    const sender = HttpAdapter.sender({ address: '/api/orders' });
    const receiver = HttpAdapter.receiver({ url: 'https://backend.example.com/orders' });

    flow.setSender(sender);
    flow.setReceiver(receiver);

    // 3. Validate (optional but recommended)
    const validationResult = validate(flow);
    if (!validationResult.valid) {
        console.error('Validation errors:', validationResult.errors);
        return;
    }
    console.log('✓ Flow is valid');

    // 4. Compile to ZIP
    const zipBuffer = await compileToZip(flow);

    // 5. Save to file
    const outputPath = 'OrderProcessing.zip';
    fs.writeFileSync(outputPath, zipBuffer);
    console.log(`✓ Generated: ${outputPath} (${zipBuffer.length} bytes)`);
}

/**
 * Example 2: Query supported components
 */
function example2_SupportedComponents() {
    console.log('\n=== Example 2: Supported Components ===');

    const components = supportedComponents();
    console.log('Available component types:');
    components.forEach(comp => console.log(`  - ${comp}`));
}

/**
 * Example 3: Compile to BPMN XML only (without packaging)
 */
async function example3_CompileToXML() {
    console.log('\n=== Example 3: Compile to BPMN XML ===');

    const flow = new IFlow('SimpleFlow');
    flow.setSender(HttpAdapter.sender({ address: '/test' }));
    flow.setReceiver(HttpAdapter.receiver({ url: 'https://example.com' }));

    const bpmnXml = await compile(flow);
    console.log(`✓ Generated BPMN XML (${bpmnXml.length} bytes)`);
    console.log('First 200 chars:', bpmnXml.toString('utf-8').substring(0, 200));
}

/**
 * Example 4: Validation before compilation
 */
function example4_Validation() {
    console.log('\n=== Example 4: Validation ===');

    // Invalid flow (missing receiver)
    const invalidFlow = new IFlow('InvalidFlow');
    invalidFlow.setSender(HttpAdapter.sender({ address: '/test' }));

    const result = validate(invalidFlow);
    console.log('Validation result:');
    console.log(`  Valid: ${result.valid}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Warnings: ${result.warnings.length}`);

    if (!result.valid) {
        console.log('\nErrors:');
        result.errors.forEach(err => {
            console.log(`  [${err.code}] ${err.message}`);
        });
    }
}

/**
 * Main - Run all examples
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  SAP Integration Compiler - Consumer Package Example          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    try {
        await example1_MinimalAPI();
        example2_SupportedComponents();
        await example3_CompileToXML();
        example4_Validation();

        console.log('\n✓ All examples completed successfully\n');
    } catch (error) {
        console.error('\n✗ Error:', error);
        process.exit(1);
    }
}

main();
