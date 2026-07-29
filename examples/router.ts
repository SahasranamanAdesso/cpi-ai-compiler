import { IFlow } from "../src/model/IFlow";
import { Router } from "../src/model/Router";
import { Component } from "../src/model/Component";
import { Connection } from "../src/model/Connection";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Router Example - Generate Integration Flow with Router (Exclusive Gateway)
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Router (Gateway)
 *       ↓
 *   Route A → Content Modifier → HTTP Receiver
 *       ↓
 *   Route B → Groovy Script → HTTP Receiver
 *
 * This demonstrates:
 * - Router component (BPMN exclusiveGateway)
 * - Conditional routing based on message headers
 * - Multiple route branches
 *
 * Note: This is a v1.2.2 example showing Router SDK and Gateway XML generation.
 * Full routing logic (conditionExpression on sequence flows) is future work.
 */
async function generateRouterDemo() {
    console.log("🚀 Generating Router Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("RouterDemo");

    // Create Router component
    const router = new Router("Route by Type");

    // Define routes using fluent API
    // Note: Route targets and conditions are stored in Router model
    // but not yet mapped to BPMN conditionExpression (future enhancement)
    router
        .when("${header.type} == 'A'")
        .when("${header.type} == 'B'")
        .otherwise();

    flow.addComponent(router);

    // Route A: Content Modifier
    const routeA = new Component(
        "CallActivity_A",
        "Process Type A",
        "Enricher",
        {
            body: "Processed Type A message"
        }
    );
    flow.addComponent(routeA);
    flow.connect(router, routeA);

    // Route B: Content Modifier (Groovy would require resource packaging)
    const routeB = new Component(
        "CallActivity_B",
        "Process Type B",
        "Enricher",
        {
            body: "Processed Type B message"
        }
    );
    flow.addComponent(routeB);
    flow.connect(router, routeB);

    console.log("✅ Domain model created");
    console.log(`   - Router: ${router.name}`);
    console.log(`   - Routes: ${router.getRoutes().length} conditional`);
    console.log(`   - Default route: ${router.getDefaultRoute() ? 'Yes' : 'No'}`);

    // 2. Map to IR (BpmnDefinitions)
    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);

    console.log("✅ Mapped to BPMN IR");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'RouterDemo');

    // Clean temp directory if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "RouterDemo");

    console.log("✅ Serialized to .iflw");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'RouterDemo.zip');

    // Remove existing ZIP
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "RouterDemo", outputZip);

    console.log(`\n🎉 SUCCESS! Generated ${outputZip}`);
    console.log(`\nGenerated BPMN includes:`);
    console.log(`   - <bpmn2:exclusiveGateway> for Router`);
    console.log(`   - Multiple outgoing sequence flows`);
    console.log(`   - Conditional routing branches`);
    console.log(`\nNext steps:`);
    console.log(`1. Open SAP Integration Suite`);
    console.log(`2. Navigate to Design → Integrations`);
    console.log(`3. Click Import`);
    console.log(`4. Upload RouterDemo.zip`);
    console.log(`5. Verify Router appears as Exclusive Gateway`);
    console.log(`\nNote: Routing conditions (conditionExpression) are stored in Router model`);
    console.log(`but not yet serialized to BPMN. This is planned for v1.2.3.`);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateRouterDemo().catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
});
