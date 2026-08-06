/**
 * Data Store Example
 *
 * Demonstrates SAP Data Store operations for message persistence:
 * - Write: Store message data
 * - Get: Retrieve stored message
 * - Delete: Remove stored message
 *
 * Evidence: ARR-2026-07-15.md lines 233-240
 */

import { IFlow } from '../src/model/IFlow';
import { DataStore } from '../src/model/DataStore';
import { BpmnProcessMapper } from '../src/mapper/BpmnProcessMapper';
import { IflowSerializer } from '../src/serializer/IflowSerializer';
import { IflowPackager } from '../src/packager/IflowPackager';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

async function generateDataStoreDemo() {
    console.log("🚀 Generating Data Store Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("DataStoreDemo");

    // Scenario: Order processing with temporary storage
    // 1. Store incoming order
    const writeOrder = DataStore.Write(
        "Store Order",
        "OrderStore",
        "${header.orderId}",
        {
            visibility: "global",  // Accessible across integration flows
            encrypt: true,         // Encrypt stored data
            expire: 90             // Keep for 90 days
        }
    );

    // 2. Retrieve order for processing
    const getOrder = DataStore.Get(
        "Retrieve Order",
        "OrderStore",
        "${header.orderId}"
    );

    // 3. Delete order after processing (cleanup)
    const deleteOrder = DataStore.Delete(
        "Delete Order",
        "OrderStore",
        "${header.orderId}"
    );

    // Build flow
    flow.addComponent(writeOrder);
    flow.addComponent(getOrder);
    flow.addComponent(deleteOrder);

    // Connect operations sequentially
    flow.connect(writeOrder, getOrder);
    flow.connect(getOrder, deleteOrder);

    console.log("✅ Domain model created");
    console.log(`   - Write to: OrderStore`);
    console.log(`   - Get from: OrderStore`);
    console.log(`   - Delete from: OrderStore`);

    // 2. Map to IR (BpmnDefinitions)
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);

    console.log("✅ Mapped to BPMN IR");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'DataStoreDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "DataStoreDemo");

    console.log("✅ Serialized to .iflw");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'DataStoreDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "DataStoreDemo", outputZip);

    console.log(`\n🎉 SUCCESS! Generated ${outputZip}`);
    console.log(`\nGenerated BPMN includes:`);
    console.log(`   ✓ <callActivity activityType="DBStorage">`);
    console.log(`   ✓ Write operation (put)`);
    console.log(`   ✓ Get operation`);
    console.log(`   ✓ Delete operation`);
    console.log(`   ✓ SAP metadata (cmdVariantUri, componentVersion)`);
    console.log(`\nNext steps:`);
    console.log(`1. Open SAP Integration Suite`);
    console.log(`2. Navigate to Design → Integrations`);
    console.log(`3. Click Import`);
    console.log(`4. Upload DataStoreDemo.zip`);
    console.log(`5. Verify no validation errors`);
    console.log(`6. Check Data Store operations are configurable`);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateDataStoreDemo().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
