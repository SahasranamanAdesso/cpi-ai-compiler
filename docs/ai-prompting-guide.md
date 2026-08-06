# AI Prompting Guide for Compiler Translation

**Version**: 1.0  
**Purpose**: Instructions for LLMs to translate natural language → valid Compiler JSON  
**Audience**: Any LLM (GPT-4, Claude, etc.)

---

## Overview

This guide helps you translate user requests like "receive orders via HTTP and validate them" into valid TypeScript SDK calls that generate SAP Integration Flows.

---

## Step-by-Step Translation Process

### 1. Parse User Intent

Identify:
- **Entry point** (Sender): How does data enter? (HTTP, SFTP, SOAP, etc.)
- **Processing steps**: What happens to data? (modify, validate, transform, route)
- **Exit point** (Receiver): Where does data go? (HTTP, SFTP, OData, etc.)
- **Branches**: Are there conditional paths?
- **Resources**: Are transformations needed? (Groovy, XSLT, XSD)

**Example Request**: "Receive orders via HTTPS, validate against schema, transform to JSON, send to REST API"

**Parsed**:
- Sender: HTTPS
- Steps: XML Validator, (maybe XSLT or Groovy for XML→JSON)
- Receiver: HTTP
- Resources: XSD schema

### 2. Map to SDK Components

Consult `docs/AI_COMPONENT_METADATA.json` for exact API:

```typescript
// Sender
HttpAdapter.sender({address: "/api/orders"})

// Components
new Component("Validator", "Validate Order", "XmlValidator", {
    xmlSchemaSource: "iflowOption",
    xsd: "/xsd/Order.xsd"
})

// Receiver
HttpAdapter.receiver({url: "https://target.example.com/orders"})

// Resources
new XsdResource("Order.xsd", xsdContent)
```

### 3. Check ComponentRegistry

Before generating, verify component exists:

**Available Components** (from ComponentRegistry):
- Enricher (Content Modifier)
- Router (Exclusive Gateway)
- ScriptCollection (Groovy Script)
- XmlValidator
- XSLTMapping
- MessageMapping
- GeneralSplitter
- Gather
- Multicast
- DBStorage
- ProcessCall

**Available Adapters**:
- HTTP/HTTPS
- OData
- SFTP
- SOAP
- IDoc

❌ If user asks for unavailable component (e.g., "JMS Adapter"), respond:
> "JMS Adapter is not currently supported. Available adapters: HTTP/HTTPS, OData, SFTP, SOAP, IDoc. Would you like to use one of these?"

### 4. Generate Deterministic IDs

Use timestamp or counter for uniqueness:

```typescript
// Good
const id = `Component_${Date.now()}`
const id = `Modifier_${index}`

// Bad (non-deterministic)
const id = Math.random().toString()
```

### 5. Build Flow Structure

**Always follow this order**:

```typescript
// 1. Create IFlow
const flow = new IFlow("FlowName");

// 2. Create adapters
const sender = HttpAdapter.sender({...});
const receiver = HttpAdapter.receiver({...});

// 3. Create components
const component1 = new Component(...);
const component2 = new Component(...);

// 4. Create resources (if needed)
const resource = new XsdResource(...);

// 5. Set sender/receiver
flow.setSender(sender);
flow.setReceiver(receiver);

// 6. Add components
flow.addComponent(component1);
flow.addComponent(component2);

// 7. Add resources
flow.addResource(resource);

// 8. Connect components
flow.connect(component1, component2);
```

### 6. Validate Against Rules

Before returning, check:

✅ Exactly 1 IFlow  
✅ Exactly 1 Sender  
✅ At least 1 Receiver  
✅ All components added before connecting  
✅ Router has ≥2 routes  
✅ Resource-dependent components have paired resources  
✅ Resource names match component references  
✅ Expressions use single `=` not `==`  
✅ No hardcoded metadata  

See `docs/compiler-validation-rules.md` for complete list.

---

## Using AI_COMPONENT_METADATA.json

This is your **primary reference**.

### Structure

```json
{
  "components": {
    "IFlow": {
      "constructor": {...},
      "methods": {...},
      "validation": {...}
    },
    "Component": {...},
    "Router": {...}
  },
  "usagePatterns": {...},
  "expressionLanguage": {...},
  "aiGuidelines": {...}
}
```

### How to Use It

**For component creation**:
```typescript
// Look up: components.Component.constructor.parameters
new Component(id, name, componentType, properties)
```

**For methods**:
```typescript
// Look up: components.IFlow.methods.connect
flow.connect(from, to)
```

**For validation**:
```typescript
// Look up: components.Router.validation.constraints
// minRoutes: 1
// Must have at least 1 route
```

**For expressions**:
```typescript
// Look up: expressionLanguage.syntax.comparison
// Use single = not ==
"${header.Country} = 'IN'"
```

---

## Avoiding Hallucinations

### ❌ Never Invent Components

**Bad**:
```typescript
❌ new Component("id", "name", "JsonTransformer", {})
❌ new Component("id", "name", "EmailSender", {})
```

**Good**:
```typescript
✅ Check ComponentRegistry first
✅ If not found, use Groovy Script for custom logic
✅ Or tell user: "Component not available"
```

### ❌ Never Invent Adapters

**Bad**:
```typescript
❌ JmsAdapter.sender({...})
❌ KafkaAdapter.receiver({...})
```

**Good**:
```typescript
✅ Check available adapters: HTTP, OData, SFTP, SOAP, IDoc
✅ Suggest closest alternative
```

### ❌ Never Invent Properties

**Bad**:
```typescript
❌ new Component("id", "name", "Enricher", {
      customProperty: "value"  // Not in Registry
   })
```

**Good**:
```typescript
✅ Only use properties documented in ComponentRegistry
✅ For Content Modifier: body, headerTable, propertyTable, bodyType, wrapContent
```

### ❌ Never Generate BPMN Directly

**Bad**:
```typescript
❌ const xml = "<bpmn2:callActivity>...</bpmn2:callActivity>"
❌ return {bpmn: xmlString}
```

**Good**:
```typescript
✅ Only use SDK classes (IFlow, Component, etc.)
✅ Let compiler generate BPMN
```

---

## Deterministic Output

### Requirement

Same input → Same output (every time)

### How to Achieve

1. **Consistent ID Generation**
   ```typescript
   // Use index-based IDs
   const modifier1 = new Component("Modifier_1", ...)
   const modifier2 = new Component("Modifier_2", ...)
   
   // Or timestamp (but only once per flow)
   const baseId = Date.now()
   const modifier1 = new Component(`Modifier_${baseId}_1`, ...)
   ```

2. **Predictable Naming**
   ```typescript
   // Derive from user intent
   User: "validate orders"
   ✅ name: "Validate Orders"
   
   User: "transform to JSON"
   ✅ name: "Transform to JSON"
   ```

3. **Property Defaults**
   ```typescript
   // Omit optional properties unless user specifies
   ❌ {body: "Hello", bodyType: "constant", wrapContent: "", ...}
   ✅ {body: "Hello"}  // Only required
   ```

4. **Stable Component Order**
   ```typescript
   // Always add in processing order
   flow.addComponent(step1)
   flow.addComponent(step2)
   flow.addComponent(step3)
   ```

---

## Common Translation Patterns

### Pattern 1: Simple HTTP → Modify → HTTP

**User**: "Receive HTTP, set body to 'Hello', send to https://example.com"

**Output**:
```typescript
const flow = new IFlow("SimpleFlow");

const sender = HttpAdapter.sender({address: "/api/endpoint"});
const receiver = HttpAdapter.receiver({url: "https://example.com"});

const modifier = new Component(
    "Modifier_1",
    "Set Body",
    "Enricher",
    {body: "Hello"}
);

flow.setSender(sender);
flow.setReceiver(receiver);
flow.addComponent(modifier);
```

### Pattern 2: Conditional Routing

**User**: "Route orders: India → A, others → B"

**Output**:
```typescript
const flow = new IFlow("RoutingFlow");

const sender = HttpAdapter.sender({address: "/api/orders"});
const receiverA = HttpAdapter.receiver({url: "https://india.example.com"});
const receiverB = HttpAdapter.receiver({url: "https://global.example.com"});

const router = new Router("Route by Country");
router.when("${header.Country} = 'IN'").otherwise();

const processIndia = new Component("Process_IN", "Process India", "Enricher", {
    body: "India order"
});
const processOthers = new Component("Process_OT", "Process Others", "Enricher", {
    body: "Global order"
});

flow.setSender(sender);
flow.setReceiver(receiverA);  // Primary receiver

flow.addComponent(router);
flow.addComponent(processIndia);
flow.addComponent(processOthers);

flow.connect(router, processIndia);
flow.connect(router, processOthers);
```

### Pattern 3: Validate + Transform

**User**: "Validate XML and transform with XSLT"

**Output**:
```typescript
const flow = new IFlow("ValidateTransformFlow");

const sender = HttpAdapter.sender({address: "/api/xml"});
const receiver = HttpAdapter.receiver({url: "https://target.example.com"});

const validator = new Component("Validator_1", "Validate XML", "XmlValidator", {
    xmlSchemaSource: "iflowOption",
    xsd: "/xsd/Schema.xsd",
    preventException: "false"
});

const mapping = new Component("Mapping_1", "Transform", "XSLTMapping", {
    mappingname: "Transform",
    mappinguri: "dir://mapping/xslt/src/main/resources/mapping/Transform.xsl",
    mappingpath: "src/main/resources/mapping/",
    mappingSource: "mappingSrcIflow",
    mappingoutputformat: "Bytes"
});

const xsd = new XsdResource("Schema.xsd", xsdContent);
const xslt = new XsltResource("Transform.xsl", xsltContent);

flow.setSender(sender);
flow.setReceiver(receiver);
flow.addComponent(validator);
flow.addComponent(mapping);
flow.addResource(xsd);
flow.addResource(xslt);

flow.connect(validator, mapping);
```

---

## Error Recovery

### Error: Component Not Found

```typescript
User: "Add a Redis cache"

❌ new Component("id", "Cache", "RedisCache", {})

✅ Response:
"Redis Cache is not available. Available data storage: Data Store (temporary message storage). Would you like to use Data Store instead, or implement caching logic in a Groovy Script?"
```

### Error: Duplicate IDs

```typescript
❌ const a = new Component("CMP_1", "A", "Enricher", {})
   const b = new Component("CMP_1", "B", "Enricher", {})

✅ const a = new Component("CMP_1", "A", "Enricher", {})
   const b = new Component("CMP_2", "B", "Enricher", {})
```

### Error: Route Mismatch

```typescript
// Router has 2 routes
router.when("...").otherwise()

❌ flow.connect(router, a)  // Only 1 connection

✅ flow.connect(router, a)
   flow.connect(router, b)  // Match route count
```

### Error: Missing Resource

```typescript
❌ new GroovyScript("Transform", "script.groovy")
   // No resource

✅ new GroovyScript("Transform", "script.groovy")
   flow.addResource(new GroovyResource("script.groovy", scriptContent))
```

---

## Final Checklist

Before returning code to user:

- [ ] Used `AI_COMPONENT_METADATA.json` as reference
- [ ] All components exist in ComponentRegistry
- [ ] All adapters from supported list (HTTP/OData/SFTP/SOAP/IDoc)
- [ ] IDs are unique and deterministic
- [ ] Components added before connections
- [ ] Router has ≥2 routes with matching connections
- [ ] Resources paired with components
- [ ] Expressions use single `=` and single quotes
- [ ] No hardcoded BPMN or metadata
- [ ] Code follows order: IFlow → Adapters → Components → Resources → Set → Add → Connect

---

## Example Complete Flow

**User Request**: "Poll SFTP for CSV files, validate XML (after conversion), route by country to different endpoints"

**Your Response**:

```typescript
const flow = new IFlow("SftpProcessingFlow");

// Adapters
const sender = SftpAdapter.sender({
    host: "sftp.example.com",
    directory: "/incoming",
    filePattern: "*.csv"
});

const receiverIndia = HttpAdapter.receiver({
    url: "https://india.example.com/orders"
});

const receiverGlobal = HttpAdapter.receiver({
    url: "https://global.example.com/orders"
});

// Components
const converter = new Component(
    "Converter_1",
    "CSV to XML",
    "Enricher",
    {body: "<Order>...</Order>"}  // Simplified - use Groovy for real conversion
);

const validator = new Component(
    "Validator_1",
    "Validate Order",
    "XmlValidator",
    {
        xmlSchemaSource: "iflowOption",
        xsd: "/xsd/Order.xsd",
        preventException: "false"
    }
);

const router = new Router("Route by Country");
router.when("${header.Country} = 'IN'").otherwise();

const processIndia = new Component("Process_IN", "Process India", "Enricher", {
    headerTable: `<row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>IN</cell><cell id='Name'>Region</cell></row>`
});

const processOthers = new Component("Process_OT", "Process Others", "Enricher", {
    headerTable: `<row><cell id='Action'>Create</cell><cell id='Type'>constant</cell><cell id='Value'>Global</cell><cell id='Name'>Region</cell></row>`
});

// Resources
const xsd = new XsdResource(
    "Order.xsd",
    `<?xml version="1.0"?>
    <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
        <xs:element name="Order">...</xs:element>
    </xs:schema>`
);

// Build flow
flow.setSender(sender);
flow.setReceiver(receiverIndia);

flow.addComponent(converter);
flow.addComponent(validator);
flow.addComponent(router);
flow.addComponent(processIndia);
flow.addComponent(processOthers);

flow.addResource(xsd);

flow.connect(converter, validator);
flow.connect(validator, router);
flow.connect(router, processIndia);
flow.connect(router, processOthers);
```

**Explanation to user**:

> This flow:
> 1. Polls SFTP for CSV files
> 2. Converts CSV to XML (simplified in Content Modifier - use Groovy Script for real conversion)
> 3. Validates XML against Order.xsd schema
> 4. Routes by Country header: India → india.example.com, others → global.example.com
>
> Note: CSV→XML conversion shown as placeholder. For production, use Groovy Script with CSV parsing library.

---

**Remember**: Your job is to translate intent → valid SDK calls, not to implement SAP Integration Suite yourself. Let the compiler handle BPMN generation.
