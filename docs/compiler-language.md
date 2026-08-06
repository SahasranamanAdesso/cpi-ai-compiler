# Compiler Language Specification

**Version**: 1.0  
**Purpose**: Define how natural language maps to valid Compiler JSON

---

## Language Overview

The compiler accepts **TypeScript SDK calls** that generate SAP Integration Flow (.iflw) artifacts. Natural language requests must translate to a deterministic sequence of SDK method calls.

### Core Concepts

1. **IFlow** - Container for entire integration flow
2. **Adapters** - Sender (entry) and Receiver (exit) endpoints
3. **Components** - Processing steps (Content Modifier, Router, Groovy Script, etc.)
4. **Connections** - Sequence flows linking components
5. **Resources** - External files (XSD schemas, XSLT stylesheets, Groovy scripts)

---

## Flow Structure

### Mandatory Elements

Every valid integration flow MUST have:

1. **Exactly ONE IFlow** - Root container
2. **Exactly ONE Sender** - Message entry point
3. **At least ONE Receiver** - Message exit point
4. **At least ONE sequence** - Start → Components → End

### Optional Elements

- **Processing Components** - Transform, validate, route, etc.
- **Resources** - Referenced by components (XSD, XSLT, Groovy)
- **Subprocesses** - Local Integration Processes (not in minimal spec)

---

## Component Types

### 1. Adapters (Entry/Exit Points)

**Senders** (ONE per flow):
- HTTP/HTTPS - Receive HTTP requests
- SFTP - Poll files from SFTP server
- SOAP - Receive SOAP calls
- IDoc - Receive SAP IDocs
- OData - Poll OData service

**Receivers** (ONE or MORE per flow):
- HTTP/HTTPS - Send HTTP requests
- SFTP - Write files to SFTP
- SOAP - Call SOAP service
- IDoc - Send SAP IDocs
- OData - Call OData service

### 2. Processing Components

**Content Modifier (Enricher)**
- Set message body
- Add/modify headers
- Add/modify properties

**Router (ExclusiveGateway)**
- Conditional branching
- Requires ≥2 routes (1 conditional + 1 default)

**Groovy Script**
- Custom transformation logic
- **Requires paired GroovyResource**

**XML Validator**
- Validate XML against XSD schema
- **Requires paired XsdResource**

**XSLT Mapping**
- Transform XML using XSLT
- **Requires paired XsltResource**

**Data Store**
- Temporary message persistence
- Operations: put (write), get (read), delete

**Splitter**
- Split one message into many
- XPath or token-based

**Gather**
- Aggregate many messages into one
- Typically paired with Splitter

**Multicast**
- Send to multiple receivers in parallel

**Message Mapping**
- Graphical mapping transformation
- **Requires paired MappingResource**

**Process Call**
- Invoke local subprocess

### 3. Resources (External Files)

- **GroovyResource** - Groovy script (.groovy)
- **XsdResource** - XML schema (.xsd)
- **XsltResource** - XSLT stylesheet (.xsl)
- **MappingResource** - Message mapping (.mmap)

---

## Component Relationships

### Linear Flow
```
Sender → Component A → Component B → Receiver
```

### Conditional Flow (Router)
```
Sender → Content Modifier → Router → Component A → Receiver
                                   → Component B → Receiver (default)
```

### Resource-Backed Component
```
Flow:
  - GroovyScript (references "transform.groovy")
  - GroovyResource ("transform.groovy", <script content>)

Validation: GroovyScript.scriptName == GroovyResource.name
```

---

## Sequence Rules

### 1. Connection Sequence

Every component (except Sender/Receiver) must be:
- **Reachable** - Connected FROM Start or another component
- **Terminal** - Connected TO End or another component

### 2. Router Branch Rules

```typescript
Router with N routes MUST have N outgoing connections

Example:
  router.when("${header.Type} = 'A'")  // Route 1
        .otherwise()                    // Route 2

  flow.connect(router, componentA)      // Route 1 target
  flow.connect(router, componentB)      // Route 2 target
```

### 3. Multicast Rules

Multicast sends to ALL connected targets simultaneously:
```typescript
flow.connect(multicast, receiverA)
flow.connect(multicast, receiverB)
flow.connect(multicast, receiverC)
// Message goes to A, B, and C in parallel
```

---

## What AI MUST NEVER Generate

### ❌ Invalid Patterns

1. **Direct BPMN/XML** - Never generate XML directly
   ```xml
   ❌ <bpmn2:callActivity>...</bpmn2:callActivity>
   ```

2. **Compiler Internals** - Never use IR classes
   ```typescript
   ❌ new BpmnNode(...)
   ❌ new BpmnDefinitions(...)
   ```

3. **Custom Component Types** - Only use ComponentRegistry types
   ```typescript
   ❌ new Component("id", "name", "CustomTransformer", {})
   ```

4. **Hardcoded Metadata** - Never set activityType, cmdVariantUri manually
   ```typescript
   ❌ {activityType: "Enricher", cmdVariantUri: "..."}
   ```

5. **Double Equals in Expressions** - SAP uses single `=`
   ```typescript
   ❌ "${header.Country} == 'IN'"
   ✅ "${header.Country} = 'IN'"
   ```

6. **Router with One Route** - Minimum 2 routes required
   ```typescript
   ❌ router.when("...") // Only 1 route
   ✅ router.when("...").otherwise() // 2 routes
   ```

7. **Orphaned Resources** - Every resource must be referenced
   ```typescript
   ❌ flow.addResource(xsd) // No XmlValidator using it
   ✅ xmlValidator uses xsd → flow.addResource(xsd)
   ```

8. **Missing Resource** - Every resource-dependent component needs its file
   ```typescript
   ❌ new GroovyScript("Transform", "script.groovy") // No GroovyResource
   ✅ + new GroovyResource("script.groovy", "...")
   ```

---

## Natural Language Mapping Examples

### "Receive HTTP, modify body, send to endpoint"
```typescript
const flow = new IFlow("SimpleFlow");
const sender = HttpAdapter.sender({address: "/api/orders"});
const receiver = HttpAdapter.receiver({url: "https://api.example.com"});

const modifier = new Component("CM1", "Set Body", "Enricher", {
    body: "Processed order"
});

flow.setSender(sender);
flow.setReceiver(receiver);
flow.addComponent(modifier);
```

### "Route orders by country: India → A, others → B"
```typescript
const router = new Router("Route by Country");
router.when("${header.Country} = 'IN'").otherwise();

const processIndia = new Component("CMP_IN", "Process India", "Enricher", {...});
const processOthers = new Component("CMP_OT", "Process Others", "Enricher", {...});

flow.addComponent(router);
flow.addComponent(processIndia);
flow.addComponent(processOthers);
flow.connect(router, processIndia);   // Route 1
flow.connect(router, processOthers);  // Route 2 (default)
```

### "Validate XML and transform with XSLT"
```typescript
const validator = new Component("Validator", "Validate Order", "XmlValidator", {
    xsd: "/xsd/Order.xsd",
    xmlSchemaSource: "iflowOption"
});

const mapping = new Component("Mapping", "Transform", "XSLTMapping", {
    mappingname: "OrderTransform",
    mappinguri: "dir://mapping/xslt/src/main/resources/mapping/OrderTransform.xsl"
});

const xsd = new XsdResource("Order.xsd", "<xs:schema>...</xs:schema>");
const xslt = new XsltResource("OrderTransform.xsl", "<xsl:stylesheet>...</xsl:stylesheet>");

flow.addComponent(validator);
flow.addComponent(mapping);
flow.addResource(xsd);
flow.addResource(xslt);
flow.connect(validator, mapping);
```

---

## Deterministic Generation Rules

1. **Unique IDs** - Use timestamp or counter: `Component_${Date.now()}`
2. **Consistent Naming** - Derive from user intent: "Process India Orders"
3. **Property Defaults** - Omit optional properties unless user specifies
4. **Resource Names** - Match component references exactly
5. **Add Before Connect** - `addComponent()` before `connect()`

---

## Validation Checklist

Before generating, verify:

- [ ] Exactly 1 IFlow
- [ ] Exactly 1 Sender
- [ ] At least 1 Receiver
- [ ] All components added to flow
- [ ] Router has ≥2 routes with matching connections
- [ ] Resource-dependent components have paired resources
- [ ] All resource names match component references
- [ ] No orphaned components (unreachable or non-terminal)
- [ ] Expressions use single `=` not `==`
- [ ] Component types exist in ComponentRegistry
