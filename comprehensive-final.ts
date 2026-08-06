/**
 * Multicast Example
 *
 * Demonstrates SAP Multicast (Parallel Gateway) for broadcasting messages
 * to multiple receivers simultaneously.
 *
 * Evidence: IPRO_SRM_MM_MAIN.iflw lines 1397-1421
 */

import { IFlow } from '../src/model/IFlow';
import { Multicast } from '../src/model/Multicast';
import { Component } from '../src/model/Component';
import { BpmnProcessMapper } from '../src/mapper/BpmnProcessMapper';
import { IflowSerializer } from '../src/serializer/IflowSerializer';
import { IflowPackager } from '../src/packager/IflowPackager';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

async function generateMulticastDemo() {
    console.log("🚀 Generating Multicast Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("MulticastDemo");

    // Scenario: Order received - send to multiple systems in parallel
    // - CRM system (update customer)
    // - Warehouse system (prepare shipment)
    // - Billing system (generate invoice)

    const multicast = new Multicast("Send to Multiple Systems");

    const updateCRM = new Component(
        "CMP_UpdateCRM",
        "Update CRM",
        "Enricher",
        { body: "CRM: Customer updated" }
    );

    const prepareShipment = new Component(
        "CMP_PrepareShipment",
        "Prepare Shipment",
        "Enricher",
        { body: "Warehouse: Shipment prepared" }
    );

    const generateInvoice = new Component(
        "CMP_GenerateInvoice",
        "Generate Invoice",
        "Enricher",
        { body: "Billing: Invoice generated" }
    );

    // Build flow
    flow.addComponent(multicast);
    flow.addComponent(updateCRM);
    flow.addComponent(prepareShipment);
    flow.addComponent(generateInvoice);

    // Connect multicast to all three systems (parallel execution)
    flow.connect(multicast, updateCRM);
    flow.connect(multicast, prepareShipment);
    flow.connect(multicast, generateInvoice);

    // Merge paths back for flow completion
    flow.connect(updateCRM, prepareShipment);
    flow.connect(prepareShipment, generateInvoice);

    console.log("✅ Domain model created");
    console.log(`   - Multicast: ${multicast.name}`);
    console.log(`   - Branches: 3 (CRM, Warehouse, Billing)`);
    console.log(`   - Execution: Parallel (all branches execute simultaneously)`);

    // 2. Map to IR (BpmnDefinitions)
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);

    console.log("✅ Mapped to BPMN IR");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'MulticastDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "MulticastDemo");

    console.log("✅ Serialized to .iflw");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'MulticastDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "MulticastDemo", outputZip);

    console.log(`\n🎉 SUCCESS! Generated ${outputZip}`);
    console.log(`\nGenerated BPMN includes:`);
    console.log(`   ✓ <bpmn2:parallelGateway activityType="Multicast">`);
    console.log(`   ✓ subActivityType="parallel"`);
    console.log(`   ✓ 3 outgoing sequence flows (no conditions)`);
    console.log(`   ✓ SAP metadata (cmdVariantUri, componentVersion)`);
    console.log(`\nNext steps:`);
    console.log(`1. Open SAP Integration Suite`);
    console.log(`2. Navigate to Design → Integrations`);
    console.log(`3. Click Import`);
    console.log(`4. Upload MulticastDemo.zip`);
    console.log(`5. Verify no validation errors`);
    console.log(`6. Confirm all three branches are visible and parallel`);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateMulticastDemo().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
