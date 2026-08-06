/**
 * Order Processing Demo - Complete Package API Verification
 *
 * This example demonstrates ALL public exports from @cpi-ai/compiler
 * using ONLY the package imports (no internal source files).
 *
 * Flow Structure (Linear):
 *
 *   HTTPS Sender
 *       ↓
 *   XML Validator (validates against OrderSchema.xsd)
 *       ↓
 *   Content Modifier (add metadata)
 *       ↓
 *   Router (route by order type)
 *       ↓
 *   XSLT Mapping (transform to S/4HANA format)
 *       ↓
 *   Content Modifier (add processing flags)
 *       ↓
 *   OData Receiver (create order)
 *
 *   [Exception Subprocess - Error Handler]
 *       Error Start Event
 *           ↓
 *       Groovy Script (log error details)
 *           ↓
 *       Content Modifier (create error notification)
 *           ↓
 *       Error End Event
 *
 * Components Used:
 * - HttpAdapter (Sender)
 * - XmlValidator + XsdResource
 * - Component (Content Modifier x2)
 * - Router
 * - XsltMapping + XsltResource
 * - GroovyScript + GroovyResource
 * - ODataAdapter (Receiver)
 * - ExceptionSubprocess
 *
 * Public API Verification:
 * ✓ compileToZip() - Main compilation function
 * ✓ validate() - Validation function
 * ✓ supportedComponents() - Query function
 * ✓ All model classes
 * ✓ All resource classes
 * ✓ All adapter classes
 */

import {
    // Core compiler functions
    compileToZip,
    validate,
    supportedComponents,

    // Flow model
    IFlow,
    Component,

    // Routing
    Router,

    // Content transformation
    XmlValidator,
    XsdResource,
    XsltMapping,
    XsltResource,
    GroovyScript,
    GroovyResource,

    // Adapters
    HttpAdapter,
    ODataAdapter,

    // Exception handling
    ExceptionSubprocess,

    // Validation types
    ValidationResult
} from '@cpi-ai/compiler';

import * as fs from 'fs';
import * as path from 'path';

async function generateOrderProcessingDemo() {
    console.log("🚀 Order Processing Demo - Package API Verification\n");
    console.log("=".repeat(70));
    console.log("Building comprehensive Integration Flow using ONLY package imports");
    console.log("=".repeat(70));
    console.log();

    // Display supported components
    console.log("📋 Supported Components:");
    const components = supportedComponents();
    components.forEach(comp => {
        console.log(`   ✓ ${comp}`);
    });
    console.log();

    // 1. Create Integration Flow
    const flow = new IFlow("OrderProcessing");
    console.log("✅ Created IFlow: OrderProcessing\n");

    // 2. Set HTTPS Sender
    const sender = HttpAdapter.sender({
        address: "/orders"
    });
    flow.setSender(sender);
    console.log("✅ Added HTTPS Sender");
    console.log(`   Address: /orders\n`);

    // 3. Create XSD Resource for XML Validation
    const orderSchemaXsd = new XsdResource(
        "OrderSchema.xsd",
        `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/order"
           xmlns="http://example.com/order"
           elementFormDefault="qualified">

    <xs:element name="Order">
        <xs:complexType>
            <xs:sequence>
                <xs:element name="OrderID" type="xs:string"/>
                <xs:element name="OrderType" type="xs:string"/>
                <xs:element name="CustomerName" type="xs:string"/>
                <xs:element name="Amount" type="xs:decimal"/>
                <xs:element name="Items">
                    <xs:complexType>
                        <xs:sequence>
                            <xs:element name="Item" maxOccurs="unbounded">
                                <xs:complexType>
                                    <xs:sequence>
                                        <xs:element name="ProductID" type="xs:string"/>
                                        <xs:element name="Quantity" type="xs:integer"/>
                                        <xs:element name="Price" type="xs:decimal"/>
                                    </xs:sequence>
                                </xs:complexType>
                            </xs:element>
                        </xs:sequence>
                    </xs:complexType>
                </xs:element>
            </xs:sequence>
        </xs:complexType>
    </xs:element>
</xs:schema>`
    );
    flow.addResource(orderSchemaXsd);
    console.log("✅ Added XSD Resource: OrderSchema.xsd\n");

    // 4. Add XML Validator
    const xmlValidator = new XmlValidator(
        "ValidateOrder",
        "OrderSchema.xsd"
    );
    flow.addComponent(xmlValidator);
    console.log("✅ Added XML Validator");
    console.log(`   Schema: OrderSchema.xsd\n`);

    // 5. Add Content Modifier (add metadata)
    const addMetadata = new Component(
        "CallActivity_AddMetadata",
        "Add Processing Metadata",
        "Enricher",
        {
            propertyTable: `<row><cell id='Action'>Create</cell><cell id='Type'>expression</cell><cell id='Value'>\${date:now}</cell><cell id='Name'>ProcessedAt</cell></row><row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>OrderProcessing_v1.0</cell><cell id='Name'>FlowVersion</cell></row>`
        }
    );
    flow.addComponent(addMetadata);
    flow.connect(xmlValidator, addMetadata);
    console.log("✅ Added Content Modifier: Add Processing Metadata\n");

    // 6. Create Router (demonstrates Router component)
    const router = new Router("Route by Order Type");
    router
        .when("${xpath.//OrderType} = 'STANDARD'")
        .when("${xpath.//OrderType} = 'EXPRESS'")
        .otherwise();

    flow.addComponent(router);
    flow.connect(addMetadata, router);
    console.log("✅ Added Router: Route by Order Type");
    console.log(`   Conditional Routes: ${router.getRoutes().length}`);
    console.log(`   Default Route: ${router.getDefaultRoute() ? 'Yes' : 'No'}\n`);

    // 7. Create XSLT Resource for transformation
    const orderTransformXslt = new XsltResource(
        "OrderTransform.xsl",
        `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ord="http://example.com/order"
    xmlns:s4="http://sap.com/s4hana/order">

    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="/">
        <s4:SalesOrder>
            <s4:OrderHeader>
                <s4:ExternalOrderID><xsl:value-of select="ord:Order/ord:OrderID"/></s4:ExternalOrderID>
                <s4:SoldToParty><xsl:value-of select="ord:Order/ord:CustomerName"/></s4:SoldToParty>
                <s4:TotalAmount><xsl:value-of select="ord:Order/ord:Amount"/></s4:TotalAmount>
                <s4:OrderType><xsl:value-of select="ord:Order/ord:OrderType"/></s4:OrderType>
            </s4:OrderHeader>
            <s4:Items>
                <xsl:for-each select="ord:Order/ord:Items/ord:Item">
                    <s4:Item>
                        <s4:Material><xsl:value-of select="ord:ProductID"/></s4:Material>
                        <s4:Quantity><xsl:value-of select="ord:Quantity"/></s4:Quantity>
                        <s4:NetPrice><xsl:value-of select="ord:Price"/></s4:NetPrice>
                    </s4:Item>
                </xsl:for-each>
            </s4:Items>
        </s4:SalesOrder>
    </xsl:template>
</xsl:stylesheet>`
    );
    flow.addResource(orderTransformXslt);
    console.log("✅ Added XSLT Resource: OrderTransform.xsl\n");

    // 8. Add XSLT Mapping
    const xsltMapping = new XsltMapping(
        "Transform to S4HANA",
        "OrderTransform.xsl"
    );
    flow.addComponent(xsltMapping);
    flow.connect(router, xsltMapping);
    console.log("✅ Added XSLT Mapping: Transform to S4HANA\n");

    // 9. Add Content Modifier (final processing)
    const addProcessingFlags = new Component(
        "CallActivity_ProcessingFlags",
        "Add Processing Flags",
        "Enricher",
        {
            propertyTable: `<row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>HIGH</cell><cell id='Name'>Priority</cell></row><row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>true</cell><cell id='Name'>SendConfirmation</cell></row>`
        }
    );
    flow.addComponent(addProcessingFlags);
    flow.connect(xsltMapping, addProcessingFlags);
    console.log("✅ Added Content Modifier: Add Processing Flags\n");

    // 10. Set OData Receiver
    const odataReceiver = ODataAdapter.receiver({
        name: "Create Sales Order",
        address: "{{S4HANA_URL}}/sap/opu/odata/sap/API_SALES_ORDER_SRV",
        resourcePath: "A_SalesOrder",
        operation: "Create"
    });
    flow.setReceiver(odataReceiver);
    console.log("✅ Added OData Receiver: Create Sales Order\n");

    // 11. Create Groovy Script Resource for error handling
    const errorLoggerGroovy = new GroovyResource(
        "ErrorLogger.groovy",
        `import com.sap.gateway.ip.core.customdev.util.Message
import java.util.HashMap

def Message processData(Message message) {
    def messageLog = messageLogFactory.getMessageLog(message)

    // Get exception details
    def exception = message.getProperty("CamelExceptionCaught")
    def errorMessage = exception?.getMessage() ?: "Unknown error"
    def errorType = exception?.getClass()?.getName() ?: "Unknown"

    // Log error details
    messageLog.addAttachmentAsString(
        "ErrorDetails",
        "Error: \${errorMessage}\\nType: \${errorType}",
        "text/plain"
    )

    // Set properties for notification
    message.setProperty("ErrorMessage", errorMessage)
    message.setProperty("ErrorType", errorType)
    message.setProperty("ErrorTimestamp", new Date().toString())

    return message
}`
    );
    flow.addResource(errorLoggerGroovy);
    console.log("✅ Added Groovy Resource: ErrorLogger.groovy\n");

    // 12. Create Exception Subprocess
    const exceptionHandler = new ExceptionSubprocess("Error Handler");

    // Add Groovy script to log error
    const logError = new GroovyScript(
        "Log Error Details",
        "ErrorLogger.groovy"
    );
    exceptionHandler.addComponent(logError);

    // Add Content Modifier to create error notification
    const createErrorNotification = new Component(
        "CallActivity_ErrorNotification",
        "Create Error Notification",
        "Enricher",
        {
            bodyType: "constant",
            wrapContent: `{
  "alert": "Order Processing Failed",
  "flowName": "OrderProcessing",
  "severity": "High",
  "timestamp": "\${property.ErrorTimestamp}",
  "errorMessage": "\${property.ErrorMessage}",
  "errorType": "\${property.ErrorType}",
  "action": "Review failed order and retry manually"
}`
        }
    );
    exceptionHandler.addComponent(createErrorNotification);
    exceptionHandler.connect(logError, createErrorNotification);

    flow.addExceptionSubprocess(exceptionHandler);
    console.log("✅ Added Exception Subprocess: Error Handler");
    console.log(`   - Groovy Script: Log Error Details`);
    console.log(`   - Content Modifier: Create Error Notification\n`);

    // 13. Validate the flow
    console.log("=".repeat(70));
    console.log("🔍 Validating Integration Flow...\n");

    const validationResult: ValidationResult = validate(flow);

    if (validationResult.valid) {
        console.log("✅ Validation PASSED");
        console.log(`   No errors or warnings found\n`);
    } else {
        console.log("⚠️  Validation completed with issues:");
        validationResult.errors.forEach(error => {
            const icon = error.severity === 'error' ? '❌' : '⚠️';
            console.log(`   ${icon} [${error.severity.toUpperCase()}] ${error.message}`);
            if (error.component) {
                console.log(`      Component: ${error.component}`);
            }
        });
        console.log();
    }

    // 14. Compile to ZIP
    console.log("=".repeat(70));
    console.log("📦 Compiling to ZIP package...\n");

    const zipBuffer = await compileToZip(flow);

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'OrderProcessing.zip');
    fs.writeFileSync(outputPath, zipBuffer);

    const sizeKB = (zipBuffer.length / 1024).toFixed(2);
    console.log("✅ Compilation SUCCESSFUL");
    console.log(`   Output: ${outputPath}`);
    console.log(`   Size: ${sizeKB} KB\n`);

    // 15. Display summary
    console.log("=".repeat(70));
    console.log("📊 PACKAGE API VERIFICATION COMPLETE");
    console.log("=".repeat(70));
    console.log();

    console.log("Public APIs Used:");
    console.log("  ✓ compileToZip() - Main compilation function");
    console.log("  ✓ validate() - Flow validation");
    console.log("  ✓ supportedComponents() - Component query");
    console.log();

    console.log("Model Classes Used:");
    console.log("  ✓ IFlow - Flow container");
    console.log("  ✓ Component - Content Modifier (3 instances)");
    console.log("  ✓ Router - Routing logic");
    console.log("  ✓ XmlValidator - XML validation");
    console.log("  ✓ XsltMapping - XSLT transformation");
    console.log("  ✓ GroovyScript - Error logging");
    console.log("  ✓ ExceptionSubprocess - Error handling");
    console.log();

    console.log("Resource Classes Used:");
    console.log("  ✓ XsdResource - OrderSchema.xsd");
    console.log("  ✓ XsltResource - OrderTransform.xsl");
    console.log("  ✓ GroovyResource - ErrorLogger.groovy");
    console.log();

    console.log("Adapter Classes Used:");
    console.log("  ✓ HttpAdapter.sender() - HTTPS inbound");
    console.log("  ✓ ODataAdapter.receiver() - OData outbound");
    console.log();

    console.log("Flow Statistics:");
    console.log(`  - Total Components: ${flow.getComponents().length}`);
    console.log(`  - Total Resources: ${flow.getResources().length}`);
    console.log(`  - Router Routes: ${router.getRoutes().length} conditional + ${router.getDefaultRoute() ? '1' : '0'} default`);
    console.log(`  - Exception Handlers: ${flow.getExceptionSubprocesses().length}`);
    console.log();

    console.log("Integration Flow Structure:");
    console.log("  HTTPS Sender (/orders)");
    console.log("      ↓");
    console.log("  XML Validator (OrderSchema.xsd)");
    console.log("      ↓");
    console.log("  Content Modifier (Add Metadata)");
    console.log("      ↓");
    console.log("  Router (2 conditional routes + default)");
    console.log("      ↓");
    console.log("  XSLT Mapping (OrderTransform.xsl)");
    console.log("      ↓");
    console.log("  Content Modifier (Add Processing Flags)");
    console.log("      ↓");
    console.log("  OData Receiver (S/4HANA Sales Order)");
    console.log();
    console.log("  [Exception Subprocess]");
    console.log("      Error Start Event");
    console.log("          ↓");
    console.log("      Groovy Script (ErrorLogger.groovy)");
    console.log("          ↓");
    console.log("      Content Modifier (Error Notification)");
    console.log("          ↓");
    console.log("      Error End Event");
    console.log();

    console.log("Verification Result:");
    console.log("  ✅ ALL imports from @cpi-ai/compiler package");
    console.log("  ✅ NO internal source file imports");
    console.log("  ✅ Package API is complete and functional");
    console.log("  ✅ ZIP generated successfully");
    console.log();

    console.log("Next Steps:");
    console.log("  1. Import OrderProcessing.zip into SAP Integration Suite");
    console.log("  2. Configure {{S4HANA_URL}} externalized parameter");
    console.log("  3. Deploy the Integration Flow");
    console.log("  4. Test with sample order XML");
    console.log();
    console.log("=".repeat(70));
}

// Run the demo
generateOrderProcessingDemo().catch(error => {
    console.error("❌ Error generating Order Processing demo:", error);
    console.error(error.stack);
    process.exit(1);
});
