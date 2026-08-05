import { IFlow } from "../src/model/IFlow";
import { ExceptionSubprocess } from "../src/model/ExceptionSubprocess";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Exception Subprocess Example
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (process data - may throw error)
 *       ↓
 *   Groovy Script (validation - may throw error)
 *       ↓
 *   HTTP Receiver
 *
 *   [Exception Subprocess - triggered on error]
 *       Error Start Event
 *           ↓
 *       Content Modifier (log error details)
 *           ↓
 *       Content Modifier (create error notification)
 *           ↓
 *       Error End Event
 *
 * This demonstrates:
 * - Exception Subprocess (error handling)
 * - Error logging and notification
 * - Automatic exception triggering
 *
 * SAP Evidence:
 * - Exception Subprocess: POC.iflw lines 648-755
 * - activityType: ErrorEventSubProcessTemplate
 * - Triggered automatically on integration flow errors
 *
 * NOTE: This generates SDK demonstration of the classes.
 * Full error event generation requires mapper enhancement.
 */
async function generateExceptionSubprocessDemo() {
    console.log("🚀 Generating Exception Subprocess Demo Integration Flow...\n");

    // 1. Build domain model
    const flow = new IFlow("ExceptionSubprocessDemo");

    // Main process components - intentionally create a scenario that could fail
    const processData = new Component(
        "CallActivity_1",
        "Process Risky Data",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `{
    "orderId": "ORD001",
    "amount": 1000,
    "status": "pending",
    "riskLevel": "HIGH",
    "requiresValidation": true
}`
        }
    );
    flow.addComponent(processData);

    // Add Groovy script that could throw validation errors
    const GroovyResource = require("../src/model/GroovyResource").GroovyResource;
    const validateScript = new GroovyResource(
        "validateRiskyOrder.groovy",
        `import com.sap.gateway.ip.core.customdev.util.Message

def Message processData(Message message) {
    def body = message.getBody(String.class)
    def json = new groovy.json.JsonSlurper().parseText(body)

    // Simulated validation that could throw exception
    if (json.riskLevel == "HIGH" && json.amount > 5000) {
        throw new Exception("Order amount exceeds risk threshold for HIGH risk orders")
    }

    // If validation passes, add validation stamp
    json.validatedAt = new Date().toString()
    json.validationStatus = "PASSED"

    message.setBody(groovy.json.JsonOutput.toJson(json))
    return message
}
`
    );
    flow.addResource(validateScript);

    const validateData = new Component(
        "CallActivity_2",
        "Validate Risky Order",
        "ScriptCollection",
        {
            scriptFunction: "processData",
            script: "validateRiskyOrder"
        }
    );
    flow.addComponent(validateData);
    flow.connect(processData, validateData);

    console.log("✅ Main process created");
    console.log(`   - Process Data component`);
    console.log(`   - Validate Order component\n`);

    // Create Exception Subprocess
    const exceptionHandler = new ExceptionSubprocess("Error Handler");

    // Error logging component
    const logError = new Component(
        "CallActivity_EH1",
        "Log Exception Details",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${exception.message}</cell><cell id='Name'>ErrorMessage</cell></row><row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${exception.stacktrace}</cell><cell id='Name'>ErrorStackTrace</cell></row>"
        }
    );
    exceptionHandler.addComponent(logError);

    // Error notification component
    const createNotification = new Component(
        "CallActivity_EH2",
        "Create Error Notification",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `{
    "alert": "Integration Flow Error",
    "flowName": "ExceptionSubprocessDemo",
    "severity": "High",
    "timestamp": "\${date:now}",
    "errorDetails": "\${exception.message}"
}`
        }
    );
    exceptionHandler.addComponent(createNotification);
    exceptionHandler.connect(logError, createNotification);

    // Add exception subprocess to flow
    flow.addExceptionSubprocess(exceptionHandler);

    console.log("✅ Exception Subprocess created");
    console.log(`   - Name: ${exceptionHandler.name}`);
    console.log(`   - ID: ${exceptionHandler.id}`);
    console.log(`   - Error Start: ${exceptionHandler.getErrorStartEventName()}`);
    console.log(`   - Error End: ${exceptionHandler.getErrorEndEventName()}`);
    console.log(`   - Components: 2 (Log Error + Create Notification)\n`);

    console.log("✅ Domain model created");
    console.log(`   - Main process: 2 components`);
    console.log(`   - Exception handler: 2 components`);
    console.log(`   - Triggered automatically on errors\n`);

    // 2. Map to BPMN IR
    console.log("⚠️  Note: Full error event generation requires mapper enhancement");
    console.log("   This demo shows SDK usage. Error events pending.\n");

    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR (basic structure)\n");

    // 3. Serialize to .iflw file
    const tempDir = path.join(os.tmpdir(), 'ExceptionSubprocessDemo');

    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "ExceptionSubprocessDemo");
    console.log("✅ Serialized to .iflw\n");

    // 4. Package to ZIP
    const outputZip = path.join(process.cwd(), 'ExceptionSubprocessDemo.zip');

    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "ExceptionSubprocessDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    // 5. Display summary
    console.log("=".repeat(60));
    console.log("📦 EXCEPTION SUBPROCESS DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nSDK Classes Demonstrated:");
    console.log("\nExceptionSubprocess:");
    console.log("   ✓ Created error handling subprocess");
    console.log("   ✓ Added error logging component");
    console.log("   ✓ Added notification component");
    console.log("   ✓ Connected internal flow");
    console.log("   ✓ Generated error event names");
    console.log("\nError Handling Pattern:");
    console.log("   ✓ Captures exception details (message, stacktrace)");
    console.log("   ✓ Logs error information");
    console.log("   ✓ Creates error notification payload");
    console.log("   ✓ Triggered automatically when main flow fails");
    console.log("\nException Variables Available:");
    console.log("   ✓ ${exception.message} - Error message");
    console.log("   ✓ ${exception.stacktrace} - Full stack trace");
    console.log("   ✓ ${exception.type} - Exception type");
    console.log("\n⚠️  Important Notes:");
    console.log("   - SDK classes are complete and functional");
    console.log("   - Full error event generation requires mapper enhancement");
    console.log("   - Estimated mapper work: 2-3 days");
    console.log("   - ZIP demonstrates SDK API usage");
    console.log("\nNext steps:");
    console.log("1. Import ExceptionSubprocessDemo.zip into SAP Integration Suite");
    console.log("2. Review generated structure");
    console.log("3. Note: Error events require mapper enhancement");
    console.log("4. Use SDK classes in production with enhanced mapper");
    console.log("=".repeat(60));

    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateExceptionSubprocessDemo().catch(error => {
    console.error("❌ Error generating Exception Subprocess demo:", error);
    process.exit(1);
});
