import { IFlow } from "../src/model/IFlow";
import { SoapAdapter } from "../src/model/SoapAdapter";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * SOAP Adapter Example - Call SAP S/4HANA SOAP Web Service
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (create SOAP envelope)
 *       ↓
 *   SOAP Receiver (call S/4HANA web service)
 *
 * SAP Evidence: SFDP_SOAP_IDOC.iflw lines 160-243
 */
async function generateSoapAdapterDemo() {
    console.log("🚀 Generating SOAP Adapter Integration Flow...\n");

    const flow = new IFlow("SoapAdapterDemo");

    // Create SOAP envelope for product creation
    const createSOAPEnvelope = new Component(
        "CallActivity_1",
        "Create SOAP Request",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:prod="http://sap.com/xi/WebService">
    <soapenv:Header/>
    <soapenv:Body>
        <prod:ProductCreateRequest>
            <ProductID>PROD12345</ProductID>
            <ProductName>Sample Product</ProductName>
            <ProductCategory>Electronics</ProductCategory>
            <BaseUnitOfMeasure>PC</BaseUnitOfMeasure>
            <ProductGroup>FERT</ProductGroup>
        </prod:ProductCreateRequest>
    </soapenv:Body>
</soapenv:Envelope>`
        }
    );
    flow.addComponent(createSOAPEnvelope);

    console.log("✅ SOAP envelope created");
    console.log(`   - Operation: ProductCreateRequest`);
    console.log(`   - Product: PROD12345\n`);

    // Configure SOAP Receiver with Cloud Connector
    const receiver = SoapAdapter.receiverWithCloudConnector({
        name: "Call S4HANA Product Service",
        url: "https://s4hana.company.com:443/sap/bc/srt/wsdl/...",
        soapAction: "http://sap.com/xi/WebService/ProductCreate",
        soapVersion: "SOAP 1.1",
        credentialName: "S4HANA_Credentials",
        locationId: "S4HANA_CloudConnector"
    });
    flow.setReceiver(receiver);

    console.log("✅ SOAP Receiver configured");
    console.log(`   - Version: SOAP 1.1`);
    console.log(`   - Authentication: Basic (via Cloud Connector)`);
    console.log(`   - Location ID: S4HANA_CloudConnector\n`);

    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    const tempDir = path.join(os.tmpdir(), 'SoapAdapterDemo');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "SoapAdapterDemo");
    console.log("✅ Serialized to .iflw\n");

    const outputZip = path.join(process.cwd(), 'SoapAdapterDemo.zip');
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "SoapAdapterDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    console.log("=".repeat(60));
    console.log("📦 SOAP ADAPTER DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nSOAP Receiver Configuration:");
    console.log("   ✓ Protocol: SOAP 1.1");
    console.log("   ✓ Message Protocol: Plain SOAP");
    console.log("   ✓ SOAP Action: ProductCreate");
    console.log("   ✓ Authentication: Basic Authentication");
    console.log("   ✓ Credential: S4HANA_Credentials");
    console.log("   ✓ Proxy: SAP Cloud Connector");
    console.log("   ✓ Location ID: S4HANA_CloudConnector");
    console.log("   ✓ Timeout: 60 seconds");
    console.log("\nSOAP Request Structure:");
    console.log("   ✓ Envelope: SOAP 1.1 format");
    console.log("   ✓ Operation: ProductCreateRequest");
    console.log("   ✓ Namespace: http://sap.com/xi/WebService");
    console.log("\nNext steps:");
    console.log("1. Import SoapAdapterDemo.zip into SAP Integration Suite");
    console.log("2. Configure S/4HANA web service URL");
    console.log("3. Set up credentials 'S4HANA_Credentials'");
    console.log("4. Configure SAP Cloud Connector location");
    console.log("5. Deploy and test SOAP call");
    console.log("=".repeat(60));

    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateSoapAdapterDemo().catch(error => {
    console.error("❌ Error generating SOAP Adapter demo:", error);
    process.exit(1);
});
