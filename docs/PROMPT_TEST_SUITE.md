# Prompt Test Suite
## SAP Integration SDK - Version 1.3

**Purpose**: Regression suite with representative business prompts and expected SDK output for validating AI-generated flows.

---

## Table of Contents

1. [Test Categories](#test-categories)
2. [Basic Flows](#basic-flows)
3. [Router Flows](#router-flows)
4. [Transformation Flows](#transformation-flows)
5. [Complex Multi-Step Flows](#complex-multi-step-flows)
6. [Edge Cases](#edge-cases)
7. [Negative Tests](#negative-tests)
8. [Validation Tests](#validation-tests)

---

## Test Categories

| Category | Test Count | Purpose |
|----------|-----------|---------|
| Basic Flows | 5 | Simple linear flows |
| Router Flows | 5 | Conditional routing |
| Transformation Flows | 3 | Groovy scripts |
| Complex Multi-Step | 3 | Combined patterns |
| Edge Cases | 4 | Boundary conditions |
| Negative Tests | 5 | Invalid inputs |
| Validation Tests | 3 | Validation engine |

**Total Tests**: 28

---

## Basic Flows

### TEST-BASIC-001: Set Message Body

**Prompt**: *"Create an integration flow that sets the message body to 'Hello World'"*

**Expected Output**:

```typescript
import { IFlow, Component } from 'sap-integration-sdk';

const flow = new IFlow("Set Hello World");

const setBody = new Component(
    "CMP_SetBody",
    "Set Message Body",
    "Enricher",
    { body: "Hello World" }
);

flow.addComponent(setBody);

export default flow;
```

**Validation**:
- ✓ Flow created with name
- ✓ Component type is "Enricher"
- ✓ Property "body" is set
- ✓ Component added to flow

---

### TEST-BASIC-002: Add Header

**Prompt**: *"Build a flow that adds a Country header with value 'India'"*

**Expected Output**:

```typescript
import { IFlow, Component } from 'sap-integration-sdk';

const flow = new IFlow("Add Country Header");

const addHeader = new Component(
    "CMP_AddCountry",
    "Add Country Header",
    "Enricher",
    {
        headerTable: {
            Country: "India"
        }
    }
);

flow.addComponent(addHeader);

export default flow;
```

**Validation**:
- ✓ headerTable property used
- ✓ Header key-value correct

---

### TEST-BASIC-003: Add Multiple Headers

**Prompt**: *"Create a flow that adds Environment header as 'PROD' and Region header as 'APAC'"*

**Expected Output**:

```typescript
import { IFlow, Component } from 'sap-integration-sdk';

const flow = new IFlow("Add Environment Headers");

const addHeaders = new Component(
    "CMP_AddHeaders",
    "Add Environment and Region",
    "Enricher",
    {
        headerTable: {
            Environment: "PROD",
            Region: "APAC"
        }
    }
);

flow.addComponent(addHeaders);

export default flow;
```

**Validation**:
- ✓ Multiple headers in headerTable
- ✓ All headers set correctly

---

### TEST-BASIC-004: Sequential Components

**Prompt**: *"Create a flow with two steps: first add a Status header as 'Processing', then set the body to 'Order received'"*

**Expected Output**:

```typescript
import { IFlow, Component } from 'sap-integration-sdk';

const flow = new IFlow("Two Step Processing");

const addStatus = new Component(
    "CMP_AddStatus",
    "Add Status Header",
    "Enricher",
    {
        headerTable: {
            Status: "Processing"
        }
    }
);

const setBody = new Component(
    "CMP_SetBody",
    "Set Order Received Message",
    "Enricher",
    { body: "Order received" }
);

flow.addComponent(addStatus);
flow.addComponent(setBody);
flow.connect(addStatus, setBody);

export default flow;
```

**Validation**:
- ✓ Two components created
- ✓ Components connected in order
- ✓ Unique component IDs

---

### TEST-BASIC-005: Property Setting

**Prompt**: *"Build a flow that sets a property OrderID to '12345'"*

**Expected Output**:

```typescript
import { IFlow, Component } from 'sap-integration-sdk';

const flow = new IFlow("Set Order ID Property");

const setProperty = new Component(
    "CMP_SetOrderID",
    "Set Order ID",
    "Enricher",
    {
        propertyTable: {
            OrderID: "12345"
        }
    }
);

flow.addComponent(setProperty);

export default flow;
```

**Validation**:
- ✓ propertyTable used (not headerTable)
- ✓ Property value set correctly

---

## Router Flows

### TEST-ROUTER-001: Simple Conditional Route

**Prompt**: *"Create a flow that routes messages: if Country header is 'India', process locally, otherwise send to global handler"*

**Expected Output**:

```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route by Country");

const router = new Router("Route by Country");
router
    .when("${header.Country} = 'India'")
    .otherwise();

const localHandler = new Component(
    "CMP_LocalProcess",
    "Process Locally",
    "Enricher",
    { body: "Processing in India" }
);

const globalHandler = new Component(
    "CMP_GlobalProcess",
    "Process Globally",
    "Enricher",
    { body: "Processing globally" }
);

flow.addComponent(router);
flow.addComponent(localHandler);
flow.addComponent(globalHandler);

flow.connect(router, localHandler);   // Route 1: India
flow.connect(router, globalHandler);  // Route 2: default

export default flow;
```

**Validation**:
- ✓ Router created with 2 routes
- ✓ 2 connections from router
- ✓ SAP condition syntax (single =)
- ✓ .otherwise() used for default

---

### TEST-ROUTER-002: Multiple Conditions

**Prompt**: *"Route orders by priority: if priority is 'high', process immediately; if priority is 'medium', queue for later; otherwise, reject"*

**Expected Output**:

```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route by Priority");

const router = new Router("Route by Priority");
router
    .when("${header.priority} = 'high'")
    .when("${header.priority} = 'medium'")
    .otherwise();

const immediateProcess = new Component(
    "CMP_ImmediateProcess",
    "Process Immediately",
    "Enricher",
    { body: "Processing high priority order" }
);

const queueProcess = new Component(
    "CMP_QueueProcess",
    "Queue for Later",
    "Enricher",
    { body: "Queued for batch processing" }
);

const rejectProcess = new Component(
    "CMP_Reject",
    "Reject Order",
    "Enricher",
    { body: "Order rejected - low priority" }
);

flow.addComponent(router);
flow.addComponent(immediateProcess);
flow.addComponent(queueProcess);
flow.addComponent(rejectProcess);

flow.connect(router, immediateProcess);  // Route 1: high
flow.connect(router, queueProcess);      // Route 2: medium
flow.connect(router, rejectProcess);     // Route 3: default

export default flow;
```

**Validation**:
- ✓ 3 routes defined
- ✓ 3 connections match
- ✓ Conditions use correct syntax

---

### TEST-ROUTER-003: Numeric Condition

**Prompt**: *"Route based on order amount: if amount is greater than 10000, send to approval, otherwise auto-approve"*

**Expected Output**:

```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route by Amount");

const router = new Router("Route by Amount");
router
    .when("${header.amount} > 10000")
    .otherwise();

const approvalHandler = new Component(
    "CMP_Approval",
    "Send to Approval",
    "Enricher",
    { body: "Requires manual approval" }
);

const autoApprove = new Component(
    "CMP_AutoApprove",
    "Auto Approve",
    "Enricher",
    { body: "Auto-approved" }
);

flow.addComponent(router);
flow.addComponent(approvalHandler);
flow.addComponent(autoApprove);

flow.connect(router, approvalHandler);  // Route 1: > 10000
flow.connect(router, autoApprove);      // Route 2: default

export default flow;
```

**Validation**:
- ✓ Numeric comparison (>)
- ✓ Correct SAP syntax

---

### TEST-ROUTER-004: Property-Based Routing

**Prompt**: *"Route using a property: if OrderType property is 'urgent', route to fast lane, otherwise normal processing"*

**Expected Output**:

```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route by Order Type");

const router = new Router("Route by Order Type");
router
    .when("${property.OrderType} = 'urgent'")
    .otherwise();

const fastLane = new Component(
    "CMP_FastLane",
    "Fast Lane Processing",
    "Enricher",
    { body: "Urgent order - fast lane" }
);

const normalLane = new Component(
    "CMP_NormalLane",
    "Normal Processing",
    "Enricher",
    { body: "Normal order processing" }
);

flow.addComponent(router);
flow.addComponent(fastLane);
flow.addComponent(normalLane);

flow.connect(router, fastLane);
flow.connect(router, normalLane);

export default flow;
```

**Validation**:
- ✓ ${property.X} syntax used
- ✓ Correct routing structure

---

### TEST-ROUTER-005: NOT Equal Condition

**Prompt**: *"Route orders: if status is not 'CANCELLED', process order, otherwise archive"*

**Expected Output**:

```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route by Status");

const router = new Router("Route by Status");
router
    .when("${header.status} != 'CANCELLED'")
    .otherwise();

const processOrder = new Component(
    "CMP_ProcessOrder",
    "Process Order",
    "Enricher",
    { body: "Processing active order" }
);

const archiveOrder = new Component(
    "CMP_Archive",
    "Archive Cancelled Order",
    "Enricher",
    { body: "Archiving cancelled order" }
);

flow.addComponent(router);
flow.addComponent(processOrder);
flow.addComponent(archiveOrder);

flow.connect(router, processOrder);
flow.connect(router, archiveOrder);

export default flow;
```

**Validation**:
- ✓ != operator used correctly
- ✓ SAP syntax maintained

---

## Transformation Flows

### TEST-TRANSFORM-001: Simple Groovy Transform

**Prompt**: *"Create a flow with a Groovy script that converts XML to JSON"*

**Expected Output**:

```typescript
import { IFlow, GroovyScript, GroovyResource } from 'sap-integration-sdk';

const flow = new IFlow("XML to JSON Transform");

const transform = new GroovyScript(
    "Transform XML to JSON",
    "xmlToJson.groovy"
);

const scriptContent = `
import com.sap.gateway.ip.core.customdev.util.Message;
import groovy.json.JsonBuilder;
import groovy.xml.XmlSlurper;

def Message processData(Message message) {
    def body = message.getBody(String.class);
    def xml = new XmlSlurper().parseText(body);
    def json = new JsonBuilder(xml);
    message.setBody(json.toString());
    return message;
}
`;

const scriptResource = new GroovyResource(
    "xmlToJson.groovy",
    scriptContent
);

flow.addComponent(transform);
flow.addResource(scriptResource);

export default flow;
```

**Validation**:
- ✓ GroovyScript created
- ✓ GroovyResource created with matching filename
- ✓ Script has processData method
- ✓ Both added to flow

---

### TEST-TRANSFORM-002: Data Enrichment Script

**Prompt**: *"Build a flow with a script that adds a timestamp header to the message"*

**Expected Output**:

```typescript
import { IFlow, GroovyScript, GroovyResource } from 'sap-integration-sdk';

const flow = new IFlow("Add Timestamp");

const addTimestamp = new GroovyScript(
    "Add Timestamp Header",
    "addTimestamp.groovy"
);

const scriptContent = `
import com.sap.gateway.ip.core.customdev.util.Message;
import java.time.Instant;

def Message processData(Message message) {
    def timestamp = Instant.now().toString();
    message.setHeader("Timestamp", timestamp);
    return message;
}
`;

const scriptResource = new GroovyResource(
    "addTimestamp.groovy",
    scriptContent
);

flow.addComponent(addTimestamp);
flow.addResource(scriptResource);

export default flow;
```

**Validation**:
- ✓ Script modifies message
- ✓ Returns message object
- ✓ Pairing correct

---

### TEST-TRANSFORM-003: Sequential Transform

**Prompt**: *"Create a flow that first converts XML to JSON with a script, then adds a ProcessedBy header"*

**Expected Output**:

```typescript
import { IFlow, GroovyScript, GroovyResource, Component } from 'sap-integration-sdk';

const flow = new IFlow("Transform and Tag");

const transform = new GroovyScript(
    "XML to JSON",
    "xmlToJson.groovy"
);

const scriptResource = new GroovyResource(
    "xmlToJson.groovy",
    `
import com.sap.gateway.ip.core.customdev.util.Message;
import groovy.json.JsonBuilder;
import groovy.xml.XmlSlurper;

def Message processData(Message message) {
    def body = message.getBody(String.class);
    def xml = new XmlSlurper().parseText(body);
    def json = new JsonBuilder(xml);
    message.setBody(json.toString());
    return message;
}
`
);

const addHeader = new Component(
    "CMP_AddProcessedBy",
    "Add ProcessedBy Header",
    "Enricher",
    {
        headerTable: {
            ProcessedBy: "IntegrationFlow"
        }
    }
);

flow.addComponent(transform);
flow.addComponent(addHeader);
flow.addResource(scriptResource);

flow.connect(transform, addHeader);

export default flow;
```

**Validation**:
- ✓ Script and Component mixed
- ✓ Components connected
- ✓ Resource added

---

## Complex Multi-Step Flows

### TEST-COMPLEX-001: Route Then Transform

**Prompt**: *"Build a flow that routes by country: if India, apply GST calculation with a script; if US, apply sales tax with a script; otherwise set a default tax header"*

**Expected Output**:

```typescript
import { IFlow, Router, GroovyScript, GroovyResource, Component } from 'sap-integration-sdk';

const flow = new IFlow("Tax Processing by Country");

const router = new Router("Route by Country");
router
    .when("${header.Country} = 'India'")
    .when("${header.Country} = 'US'")
    .otherwise();

const gstScript = new GroovyScript("Apply GST", "applyGST.groovy");
const gstResource = new GroovyResource("applyGST.groovy", `
import com.sap.gateway.ip.core.customdev.util.Message;

def Message processData(Message message) {
    message.setHeader("TaxRate", "0.18");
    message.setHeader("TaxType", "GST");
    return message;
}
`);

const salesTaxScript = new GroovyScript("Apply Sales Tax", "applySalesTax.groovy");
const salesTaxResource = new GroovyResource("applySalesTax.groovy", `
import com.sap.gateway.ip.core.customdev.util.Message;

def Message processData(Message message) {
    message.setHeader("TaxRate", "0.07");
    message.setHeader("TaxType", "SalesTax");
    return message;
}
`);

const defaultTax = new Component(
    "CMP_DefaultTax",
    "Apply Default Tax",
    "Enricher",
    {
        headerTable: {
            TaxRate: "0.10",
            TaxType: "DefaultTax"
        }
    }
);

flow.addComponent(router);
flow.addComponent(gstScript);
flow.addComponent(salesTaxScript);
flow.addComponent(defaultTax);

flow.addResource(gstResource);
flow.addResource(salesTaxResource);

flow.connect(router, gstScript);
flow.connect(router, salesTaxScript);
flow.connect(router, defaultTax);

export default flow;
```

**Validation**:
- ✓ Router with 3 routes
- ✓ 2 Groovy scripts + 1 Component
- ✓ 2 resources with matching names
- ✓ 3 connections from router

---

## Edge Cases

### TEST-EDGE-001: Empty Flow Name Handling

**Prompt**: *"Create a flow"* (no name specified)

**Expected Behavior**: AI should generate a default name

**Expected Output**:

```typescript
import { IFlow } from 'sap-integration-sdk';

const flow = new IFlow("Integration Flow");

export default flow;
```

**Validation**:
- ✓ Default name provided
- ✓ No validation error

---

### TEST-EDGE-002: Single Route (No Otherwise)

**Prompt**: *"Route if country is India to India handler"*

**Expected Output**:

```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route to India");

const router = new Router("Route by Country");
router.when("${header.Country} = 'India'");

const indiaHandler = new Component(
    "CMP_IndiaHandler",
    "India Handler",
    "Enricher",
    { body: "Processing India order" }
);

flow.addComponent(router);
flow.addComponent(indiaHandler);

flow.connect(router, indiaHandler);

export default flow;
```

**Validation**:
- ⚠️ WARNING: Router should have default route
- ✓ Flow valid but suboptimal

---

## Negative Tests

### TEST-NEG-001: Unsupported Component Type

**Prompt**: *"Add a SOAP adapter to the flow"*

**Expected Behavior**: AI should inform user that SOAP adapter is not yet supported

**Expected Response**:

```
I cannot generate this flow because SOAP adapter is not yet supported in SDK v1.3.

Supported components:
- Content Modifier (set body, headers, properties)
- Router (conditional routing)
- Groovy Script (custom transformations)

Would you like me to suggest an alternative approach?
```

**Validation**:
- ✓ AI recognizes unsupported component
- ✓ AI provides helpful message
- ✓ No invalid code generated

---

### TEST-NEG-002: Ambiguous Prompt

**Prompt**: *"Process orders"*

**Expected Behavior**: AI should ask clarifying questions

**Expected Response**:

```
I need more details to create this flow. Could you clarify:

1. What should happen to the orders? (modify, route, transform?)
2. What conditions or logic should be applied?
3. What is the desired output?

Example: "Process orders by setting status header to 'RECEIVED'"
```

---

## Validation Tests

### TEST-VAL-001: Duplicate Component ID Detection

**Internal Test**: Verify validation engine catches duplicate IDs

```typescript
const flow = new IFlow("Test");
const comp1 = new Component("CMP_1", "A", "Enricher", {body: "A"});
const comp2 = new Component("CMP_1", "B", "Enricher", {body: "B"});
flow.addComponent(comp1);
flow.addComponent(comp2);

// Expected: ERROR IF-003
```

---

### TEST-VAL-002: Router Cardinality Mismatch

**Internal Test**: Verify route count matches connections

```typescript
const router = new Router("R").when("A").when("B");
flow.addComponent(router);
flow.addComponent(target);
flow.connect(router, target);  // Only 1 connection, need 2!

// Expected: ERROR RTR-003
```

---

### TEST-VAL-003: Missing Groovy Resource

**Internal Test**: Verify script-resource pairing

```typescript
const script = new GroovyScript("Transform", "missing.groovy");
flow.addComponent(script);
// Resource not added!

// Expected: ERROR GS-002
```

---

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run specific category
npm test -- --category=basic
npm test -- --category=router
npm test -- --category=transform

# Run single test
npm test -- --test=TEST-BASIC-001
```

### Test Results Format

```json
{
  "test": "TEST-BASIC-001",
  "status": "PASS",
  "generated": "...",
  "expected": "...",
  "validation": {
    "IF-001": "PASS",
    "CMP-002": "PASS"
  }
}
```

---

## Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Basic Flows Pass Rate | 100% | TBD |
| Router Flows Pass Rate | 100% | TBD |
| Transform Flows Pass Rate | 100% | TBD |
| Complex Flows Pass Rate | 90%+ | TBD |
| Edge Cases Handled | 100% | TBD |
| Negative Tests Pass | 100% | TBD |

---

**Total Test Cases**: 28  
**Categories**: 7  
**Coverage**: Core SDK functionality, routing, transformations, validation

---

**END OF PROMPT TEST SUITE**
