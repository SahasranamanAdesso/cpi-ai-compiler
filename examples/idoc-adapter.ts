import { IFlow } from "../src/model/IFlow";
import { IdocAdapter } from "../src/model/IdocAdapter";
import { Component } from "../src/model/Component";
import { BpmnProcessMapper } from "../src/mapper/BpmnProcessMapper";
import { IflowSerializer } from "../src/serializer/IflowSerializer";
import { IflowPackager } from "../src/packager/IflowPackager";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * IDoc Adapter Example - Send IDoc to SAP S/4HANA
 *
 * Flow structure:
 *   HTTPS Sender
 *       ↓
 *   Content Modifier (create IDoc structure)
 *       ↓
 *   IDoc Receiver (send to S/4HANA via Cloud Connector)
 *
 * SAP Evidence: SFDP_SOAP_IDOC.iflw lines 456-600
 */
async function generateIdocAdapterDemo() {
    console.log("🚀 Generating IDoc Adapter Integration Flow...\n");

    const flow = new IFlow("IdocAdapterDemo");

    // Create IDoc payload (MATMAS - Material Master)
    const createIDocPayload = new Component(
        "CallActivity_1",
        "Create MATMAS IDoc",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `<?xml version="1.0" encoding="UTF-8"?>
<MATMAS05>
    <IDOC BEGIN="1">
        <EDI_DC40 SEGMENT="1">
            <TABNAM>EDI_DC40</TABNAM>
            <MANDT>100</MANDT>
            <DOCNUM>0000000001</DOCNUM>
            <DIRECT>2</DIRECT>
            <IDOCTYP>MATMAS05</IDOCTYP>
            <MESTYP>MATMAS</MESTYP>
        </EDI_DC40>
        <E1MARAM SEGMENT="1">
            <MSGFN>005</MSGFN>
            <MATNR>PROD12345</MATNR>
            <MBRSH>M</MBRSH>
            <MTART>FERT</MTART>
            <E1MAKTM SEGMENT="1">
                <MSGFN>005</MSGFN>
                <SPRAS>EN</SPRAS>
                <MAKTX>Sample Product</MAKTX>
            </E1MAKTM>
        </E1MARAM>
    </IDOC>
</MATMAS05>`
        }
    );
    flow.addComponent(createIDocPayload);

    console.log("✅ IDoc payload created");
    console.log(`   - IDoc Type: MATMAS05`);
    console.log(`   - Message Type: MATMAS (Material Master)`);
    console.log(`   - Material: PROD12345\n`);

    // Log IDoc before sending
    const logIDoc = new Component(
        "CallActivity_2",
        "Log IDoc",
        "Enricher",
        {
            propertyTable: "<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>${body}</cell><cell id='Name'>IDocPayload</cell></row><row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>MATMAS05</cell><cell id='Name'>IDocType</cell></row>"
        }
    );
    flow.addComponent(logIDoc);
    flow.connect(createIDocPayload, logIDoc);

    // Configure IDoc Receiver with Cloud Connector
    const receiver = IdocAdapter.receiverWithCloudConnector({
        name: "Send IDoc to S4HANA",
        address: "http://s4hana:44300/sap/bc/srt/idoc",
        credentialName: "S4HANA_IDoc_Credentials",
        locationId: "S4HANA_CloudConnector",
        sapClient: "100"
    });
    flow.setReceiver(receiver);

    console.log("✅ IDoc Receiver configured");
    console.log(`   - Address: http://s4hana:44300/sap/bc/srt/idoc?sap-client=100`);
    console.log(`   - Protocol: IDoc SOAP`);
    console.log(`   - Proxy: SAP Cloud Connector`);
    console.log(`   - Location ID: S4HANA_CloudConnector\n`);

    const mapper = new BpmnProcessMapper();
    const definitions = mapper.map(flow);
    console.log("✅ Mapped to BPMN IR\n");

    const tempDir = path.join(os.tmpdir(), 'IdocAdapterDemo');
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    const serializer = new IflowSerializer();
    serializer.serialize(definitions, tempDir, "IdocAdapterDemo");
    console.log("✅ Serialized to .iflw\n");

    const outputZip = path.join(process.cwd(), 'IdocAdapterDemo.zip');
    if (fs.existsSync(outputZip)) {
        fs.unlinkSync(outputZip);
    }

    const packager = new IflowPackager();
    await packager.package(tempDir, "IdocAdapterDemo", outputZip, flow.getResources());

    console.log(`✅ ZIP package created: ${outputZip}\n`);

    console.log("=".repeat(60));
    console.log("📦 IDOC ADAPTER DEMO COMPLETE");
    console.log("=".repeat(60));
    console.log(`ZIP file: ${outputZip}`);
    console.log("\nIDoc Receiver Configuration:");
    console.log("   ✓ Component Type: IDOC");
    console.log("   ✓ Message Protocol: IDoc SOAP");
    console.log("   ✓ Address: http://s4hana:44300/sap/bc/srt/idoc?sap-client=100");
    console.log("   ✓ Authentication: Basic");
    console.log("   ✓ Credential: S4HANA_IDoc_Credentials");
    console.log("   ✓ Proxy Type: SAP Cloud Connector (sapcc)");
    console.log("   ✓ Location ID: S4HANA_CloudConnector");
    console.log("   ✓ SAP Message ID: Reuse");
    console.log("   ✓ Content Type: application/x-sap.idoc");
    console.log("   ✓ Timeout: 60 seconds");
    console.log("\nIDoc Details:");
    console.log("   ✓ IDoc Type: MATMAS05");
    console.log("   ✓ Message Type: MATMAS (Material Master)");
    console.log("   ✓ Material Number: PROD12345");
    console.log("   ✓ Material Type: FERT (Finished Product)");
    console.log("   ✓ Description: Sample Product");
    console.log("\nNext steps:");
    console.log("1. Import IdocAdapterDemo.zip into SAP Integration Suite");
    console.log("2. Configure S/4HANA IDoc endpoint");
    console.log("3. Set up credentials 'S4HANA_IDoc_Credentials'");
    console.log("4. Configure SAP Cloud Connector for on-premise access");
    console.log("5. Deploy and test IDoc posting");
    console.log("6. Verify IDoc arrives in S/4HANA (BD87, WE02)");
    console.log("=".repeat(60));

    fs.rmSync(tempDir, { recursive: true, force: true });
}

generateIdocAdapterDemo().catch(error => {
    console.error("❌ Error generating IDoc Adapter demo:", error);
    process.exit(1);
});
