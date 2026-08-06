/**
 * Minimal Test - Verify Compiler Package Works
 *
 * Tests all 4 core API functions of the refactored compiler package
 */

import {
    // 4 Core API functions
    compileToZip,
    compile,
    validate,
    supportedComponents,

    // Model classes
    IFlow,
    HttpAdapter,
    Component
} from '@adesso/sap-integration-compiler';

import * as fs from 'fs';
import * as path from 'path';

async function runMinimalTest() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Compiler Package Test - Verifying All Functions');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
        // =====================================================================
        // TEST 1: supportedComponents()
        // =====================================================================
        console.log('✓ TEST 1: supportedComponents()');
        const components = supportedComponents();
        console.log(`  Found ${components.length} supported components`);
        console.log(`  Components: ${components.slice(0, 5).join(', ')}...`);

        if (components.length === 0) {
            throw new Error('No components found!');
        }
        console.log('  ✓ PASSED\n');

        // =====================================================================
        // TEST 2: Create IFlow Model
        // =====================================================================
        console.log('✓ TEST 2: Build IFlow Model');
        const flow = new IFlow('MinimalTestFlow');

        // Add sender
        const sender = HttpAdapter.sender({ address: '/api/test' });
        flow.setSender(sender);

        // Add content modifier
        const modifier = new Component(
            'ContentModifier_1',
            'AddHeader',
            'Enricher',
            {
                Name: 'X-Test-Header',
                Action: 'Create',
                Value: 'TestValue'
            }
        );
        flow.addComponent(modifier);

        // Add receiver
        const receiver = HttpAdapter.receiver({
            url: 'https://jsonplaceholder.typicode.com/posts'
        });
        flow.setReceiver(receiver);

        console.log('  Flow: MinimalTestFlow');
        console.log('  Sender: HTTP /api/test');
        console.log('  Component: Content Modifier (AddHeader)');
        console.log('  Receiver: HTTP jsonplaceholder API');
        console.log('  ✓ PASSED\n');

        // =====================================================================
        // TEST 3: validate()
        // =====================================================================
        console.log('✓ TEST 3: validate()');
        const validationResult = validate(flow);

        console.log(`  Valid: ${validationResult.valid}`);
        console.log(`  Errors: ${validationResult.errors.length}`);
        console.log(`  Warnings: ${validationResult.warnings.length}`);

        if (!validationResult.valid) {
            console.log('  Validation Errors:');
            validationResult.errors.forEach(err => {
                console.log(`    [${err.code}] ${err.message}`);
            });
            throw new Error('Validation failed!');
        }

        if (validationResult.warnings.length > 0) {
            console.log('  Warnings:');
            validationResult.warnings.forEach(warn => {
                console.log(`    [${warn.code}] ${warn.message}`);
            });
        }

        console.log('  ✓ PASSED\n');

        // =====================================================================
        // TEST 4: compile() - BPMN XML only
        // =====================================================================
        console.log('✓ TEST 4: compile() - BPMN XML');
        const bpmnXml = await compile(flow);

        console.log(`  Generated: ${bpmnXml.length} bytes`);
        console.log(`  Format: ${bpmnXml.toString('utf-8').substring(0, 50)}...`);

        if (bpmnXml.length === 0) {
            throw new Error('BPMN XML is empty!');
        }

        if (!bpmnXml.toString('utf-8').includes('bpmn2:definitions')) {
            throw new Error('Invalid BPMN XML - missing definitions!');
        }

        console.log('  ✓ PASSED\n');

        // =====================================================================
        // TEST 5: compileToZip() - Complete ZIP package
        // =====================================================================
        console.log('✓ TEST 5: compileToZip() - ZIP Package');
        const zipBuffer = await compileToZip(flow);

        console.log(`  Generated: ${zipBuffer.length} bytes`);

        if (zipBuffer.length === 0) {
            throw new Error('ZIP buffer is empty!');
        }

        // Check ZIP signature (PK)
        const zipSignature = zipBuffer.toString('hex', 0, 2);
        if (zipSignature !== '504b') {
            throw new Error('Invalid ZIP file - wrong signature!');
        }

        console.log('  ZIP Signature: Valid (PK)');
        console.log('  ✓ PASSED\n');

        // =====================================================================
        // TEST 6: Save ZIP to file
        // =====================================================================
        console.log('✓ TEST 6: Save ZIP File');
        const outputPath = path.join(process.cwd(), 'MinimalTestFlow.zip');

        fs.writeFileSync(outputPath, zipBuffer);

        const fileSize = fs.statSync(outputPath).size;
        console.log(`  Saved to: ${outputPath}`);
        console.log(`  File size: ${fileSize} bytes`);

        if (fileSize !== zipBuffer.length) {
            throw new Error('File size mismatch!');
        }

        console.log('  ✓ PASSED\n');

        // =====================================================================
        // SUMMARY
        // =====================================================================
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  ✓ ALL TESTS PASSED');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('\nResults:');
        console.log(`  ✓ supportedComponents() - ${components.length} components`);
        console.log(`  ✓ validate() - Flow valid`);
        console.log(`  ✓ compile() - ${bpmnXml.length} bytes BPMN XML`);
        console.log(`  ✓ compileToZip() - ${zipBuffer.length} bytes ZIP`);
        console.log(`  ✓ File saved - MinimalTestFlow.zip`);
        console.log('\n✅ Compiler package is working correctly!\n');

        return true;

    } catch (error) {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('  ✗ TEST FAILED');
        console.log('═══════════════════════════════════════════════════════════');
        console.error('\nError:', error);
        return false;
    }
}

// Run the test
runMinimalTest()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
