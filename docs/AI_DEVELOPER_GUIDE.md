# AI Developer Guide
## SAP Integration SDK - Version 1.3

**Purpose**: Guide for AI systems (LLMs) to generate SAP Integration Flows from natural language prompts.

---

## Table of Contents

1. [AI Contract](#ai-contract)
2. [Prompt Analysis](#prompt-analysis)
3. [Code Generation Patterns](#code-generation-patterns)
4. [Component Selection](#component-selection)
5. [Error Recovery](#error-recovery)
6. [Example Workflows](#example-workflows)
7. [Best Practices](#best-practices)

---

## AI Contract

### What AI MUST Know

1. **SDK Classes**: `IFlow`, `Component`, `Router`, `GroovyScript`, `GroovyResource`
2. **Fluent API**: Method chaining with `.addComponent()`, `.connect()`
3. **Validation Rules**: 24 rules from [VALIDATION_RULES.md](VALIDATION_RULES.md)
4. **Component Types**: `Enricher`, `Router`, `ScriptCollection`

### What AI MUST NOT Do

1. ❌ Generate XML directly
2. ❌ Use compiler internals (BpmnNode, BpmnProcess, etc.)
3. ❌ Hardcode SAP-specific metadata
4. ❌ Create custom component types
5. ❌ Modify Registry or Writers

### AI Output Format

```typescript
// ALWAYS include imports
import { IFlow, Component, Router, GroovyScript, GroovyResource } from 'sap-integration-sdk';

// ALWAYS create flow
const flow = new IFlow("FlowName");

// ALWAYS add components before connecting
flow.addComponent(comp1);
flow.addComponent(comp2);
flow.connect(comp1, comp2);

// ALWAYS export for use
export default flow;
```

---

## Prompt Analysis

### Prompt → Intent Mapping

| User Prompt Contains | Intent | SDK Action |
|---------------------|--------|------------|
| "create flow", "build integration" | Create IFlow | `new IFlow("...")` |
| "modify body", "set message", "add header" | Content Modifier | `new Component(..., "Enricher", {...})` |
| "route", "conditional", "if country is", "based on" | Router | `new Router(...).when(...)` |
| "transform", "convert", "script", "complex logic" | Groovy Script | `new GroovyScript(...) + GroovyResource(...)` |
| "connect A to B", "then do", "followed by" | Connection | `flow.connect(A, B)` |

### Intent Extraction Algorithm

```
1. Identify primary intent (create flow, route, transform, modify)
2. Extract entities (flow name, conditions, values)
3. Map intent to SDK component
4. Generate TypeScript code
5. Validate against rules
6. Return code or error
```

### Example Prompt Analysis

**Prompt**: *"Create a flow that routes orders by country. If country is India, process locally. Otherwise, send to global handler."*

**Analysis**:
```yaml
Primary Intent: Create flow with routing
Entities:
  - Flow Name: "Route Orders by Country"
  - Route Condition: country = India
  - Targets: Local handler, Global handler
Components Needed:
  - IFlow
  - Router (2 routes: conditional + default)
  - 2 x Component (handlers)
  - 3 x Connection (router → local, router → global, global → end)
```

**Generated Code**:
```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route Orders by Country");

const router = new Router("Route by Country");
router.when("${header.Country} = 'IN'").otherwise();

const localHandler = new Component(
    "CMP_LocalProcess",
    "Process India Orders",
    "Enricher",
    { body: "Processing locally" }
);

const globalHandler = new Component(
    "CMP_GlobalProcess",
    "Process Global Orders",
    "Enricher",
    { body: "Sending to global handler" }
);

flow.addComponent(router);
flow.addComponent(localHandler);
flow.addComponent(globalHandler);

flow.connect(router, localHandler);   // First route: India
flow.connect(router, globalHandler);  // Default route: Others

export default flow;
```

---

## Code Generation Patterns

### Pattern 1: Simple Linear Flow

**Prompt**: *"Create a flow that sets the message body to 'Hello World'"*

```typescript
import { IFlow, Component } from 'sap-integration-sdk';

const flow = new IFlow("Simple Hello World");

const setBody = new Component(
    "CMP_SetBody",
    "Set Hello Message",
    "Enricher",
    { body: "Hello World" }
);

flow.addComponent(setBody);

export default flow;
```

---

### Pattern 2: Router Flow (Conditional Branching)

**Prompt**: *"Route messages based on order type. If urgent, process immediately. If standard, queue for batch."*

```typescript
import { IFlow, Router, Component } from 'sap-integration-sdk';

const flow = new IFlow("Route by Order Type");

// Create router
const router = new Router("Route by Order Type");
router
    .when("${header.orderType} = 'urgent'")
    .otherwise();  // Default for standard

flow.addComponent(router);

// Create handlers
const urgentHandler = new Component(
    "CMP_UrgentProcess",
    "Process Urgent Orders",
    "Enricher",
    { body: "Immediate processing" }
);

const standardHandler = new Component(
    "CMP_StandardQueue",
    "Queue Standard Orders",
    "Enricher",
    { body: "Queued for batch" }
);

flow.addComponent(urgentHandler);
flow.addComponent(standardHandler);

// Connect router to handlers
flow.connect(router, urgentHandler);   // Route 1: urgent
flow.connect(router, standardHandler); // Route 2: default

export default flow;
```

---

### Pattern 3: Transformation Flow (Groovy Script)

**Prompt**: *"Transform incoming XML orders to JSON format using a script"*

```typescript
import { IFlow, GroovyScript, GroovyResource } from 'sap-integration-sdk';

const flow = new IFlow("XML to JSON Transform");

// Create Groovy script component
const transform = new GroovyScript(
    "Transform XML to JSON",
    "xmlToJson.groovy"
);

// Create script resource
const scriptContent = `
import com.sap.gateway.ip.core.customdev.util.Message;
import groovy.json.JsonBuilder;
import groovy.xml.XmlSlurper;

def Message processData(Message message) {
    def body = message.getBody(String.class);
    def xml = new XmlSlurper().parseText(body);
    
    // Convert XML to JSON
    def json = new JsonBuilder(xml);
    
    message.setBody(json.toString());
    message.setHeader("ContentType", "application/json");
    
    return message;
}
`;

const scriptResource = new GroovyResource(
    "xmlToJson.groovy",
    scriptContent
);

// Add to flow
flow.addComponent(transform);
flow.addResource(scriptResource);

export default flow;
```

---

### Pattern 4: Multi-Step Flow

**Prompt**: *"Create a flow that: 1) Adds country header, 2) Routes by country, 3) Transforms data with script"*

```typescript
import { IFlow, Component, Router, GroovyScript, GroovyResource } from 'sap-integration-sdk';

const flow = new IFlow("Multi-Step Order Processing");

// Step 1: Add country header
const addHeader = new Component(
    "CMP_AddCountry",
    "Add Country Header",
    "Enricher",
    {
        headerTable: {
            Country: "${property.sourceCountry}"
        }
    }
);

// Step 2: Router
const router = new Router("Route by Country");
router
    .when("${header.Country} = 'IN'")
    .otherwise();

// Step 3a: Transform for India
const transformIN = new GroovyScript(
    "Transform India Orders",
    "transformIndia.groovy"
);

const scriptIN = new GroovyResource(
    "transformIndia.groovy",
    `// India-specific transformation
def Message processData(Message message) {
    // Add GST calculations
    return message;
}
`
);

// Step 3b: Transform for others
const transformGlobal = new GroovyScript(
    "Transform Global Orders",
    "transformGlobal.groovy"
);

const scriptGlobal = new GroovyResource(
    "transformGlobal.groovy",
    `// Global transformation
def Message processData(Message message) {
    // Standard processing
    return message;
}
`
);

// Build flow
flow.addComponent(addHeader);
flow.addComponent(router);
flow.addComponent(transformIN);
flow.addComponent(transformGlobal);
flow.addResource(scriptIN);
flow.addResource(scriptGlobal);

// Connect components
flow.connect(addHeader, router);
flow.connect(router, transformIN);      // India route
flow.connect(router, transformGlobal);  // Global route

export default flow;
```

---

## Component Selection

### Decision Tree

```
What does the user want to do?
│
├─ SET or MODIFY message content?
│  ├─ Body only? → Component("Enricher", {body: "..."})
│  ├─ Headers? → Component("Enricher", {headerTable: {...}})
│  └─ Properties? → Component("Enricher", {propertyTable: {...}})
│
├─ ROUTE based on condition?
│  └─ Router().when("...").otherwise()
│
├─ TRANSFORM with custom logic?
│  ├─ Simple? → Consider Component("Enricher")
│  └─ Complex? → GroovyScript + GroovyResource
│
└─ CONNECT components?
   └─ flow.connect(from, to)
```

### Component Type Matrix

| User Intent | Component Type | Properties | Notes |
|-------------|---------------|------------|-------|
| "set body to X" | `Enricher` | `{body: "X"}` | Replaces entire body |
| "add header Y" | `Enricher` | `{headerTable: {Y: "value"}}` | Adds/updates headers |
| "route by Z" | `Router` | Routes via `.when()` | Conditional branching |
| "transform with script" | `ScriptCollection` | `{script: "file.groovy"}` | Requires GroovyResource |
| "convert X to Y" | `ScriptCollection` | `{script: "convert.groovy"}` | Complex transformation |

---

## Error Recovery

### Common Errors & Fixes

#### Error: Duplicate Component ID

```typescript
// ❌ WRONG
const comp1 = new Component("CMP_1", "A", "Enricher", {});
const comp2 = new Component("CMP_1", "B", "Enricher", {});

// ✅ FIX: Use unique IDs
const comp1 = new Component("CMP_AddHeader", "A", "Enricher", {});
const comp2 = new Component("CMP_SetBody", "B", "Enricher", {});

// ✅ OR: Use timestamp/index
const comp1 = new Component(`CMP_${Date.now()}`, "A", "Enricher", {});
const comp2 = new Component(`CMP_${Date.now() + 1}`, "B", "Enricher", {});
```

#### Error: Router Route Mismatch

```typescript
// ❌ WRONG
router.when("...").when("...");  // 2 routes
flow.connect(router, target1);   // Only 1 connection!

// ✅ FIX: Match connections to routes
router.when("...").when("...");
flow.connect(router, target1);
flow.connect(router, target2);   // Now 2 connections
```

#### Error: Missing GroovyResource

```typescript
// ❌ WRONG
const script = new GroovyScript("Transform", "transform.groovy");
flow.addComponent(script);
// Missing resource!

// ✅ FIX: Add matching resource
const script = new GroovyScript("Transform", "transform.groovy");
const resource = new GroovyResource("transform.groovy", content);
flow.addComponent(script);
flow.addResource(resource);
```

#### Error: Component Not Added Before Connect

```typescript
// ❌ WRONG
flow.connect(compA, compB);  // compA not added yet!

// ✅ FIX: Add before connecting
flow.addComponent(compA);
flow.addComponent(compB);
flow.connect(compA, compB);
```

---

## Example Workflows

### Workflow 1: Analyzing Complex Prompt

**Prompt**: *"Build a flow that receives orders, checks if country is India or US, processes India orders with a custom script that adds GST, processes US orders with a script that adds sales tax, and for other countries just sets a default tax rate header."*

**Step-by-Step Analysis**:

1. **Identify components**:
   - Router (3 routes: India, US, Others)
   - Groovy Script for India (GST)
   - Groovy Script for US (sales tax)
   - Content Modifier for Others (default tax)

2. **Extract conditions**:
   - Route 1: `${header.Country} = 'IN'`
   - Route 2: `${header.Country} = 'US'`
   - Route 3: Otherwise (default)

3. **Generate code**:

```typescript
import { IFlow, Router, GroovyScript, GroovyResource, Component } from 'sap-integration-sdk';

const flow = new IFlow("Order Tax Processing");

// Router
const router = new Router("Route by Country");
router
    .when("${header.Country} = 'IN'")
    .when("${header.Country} = 'US'")
    .otherwise();

// India handler - Groovy Script for GST
const indiaProcessor = new GroovyScript(
    "Add GST for India",
    "addGST.groovy"
);

const gstScript = new GroovyResource(
    "addGST.groovy",
    `
def Message processData(Message message) {
    def body = message.getBody(String.class);
    // Calculate 18% GST
    message.setHeader("TaxRate", "0.18");
    message.setHeader("TaxType", "GST");
    return message;
}
`
);

// US handler - Groovy Script for Sales Tax
const usProcessor = new GroovyScript(
    "Add Sales Tax for US",
    "addSalesTax.groovy"
);

const salesTaxScript = new GroovyResource(
    "addSalesTax.groovy",
    `
def Message processData(Message message) {
    def body = message.getBody(String.class);
    // State-specific sales tax
    message.setHeader("TaxRate", "0.07");
    message.setHeader("TaxType", "SalesTax");
    return message;
}
`
);

// Others handler - Content Modifier
const othersProcessor = new Component(
    "CMP_DefaultTax",
    "Set Default Tax",
    "Enricher",
    {
        headerTable: {
            TaxRate: "0.10",
            TaxType: "StandardTax"
        }
    }
);

// Build flow
flow.addComponent(router);
flow.addComponent(indiaProcessor);
flow.addComponent(usProcessor);
flow.addComponent(othersProcessor);
flow.addResource(gstScript);
flow.addResource(salesTaxScript);

// Connect
flow.connect(router, indiaProcessor);   // Route 1: India
flow.connect(router, usProcessor);      // Route 2: US
flow.connect(router, othersProcessor);  // Route 3: Others

export default flow;
```

---

## Best Practices

### DO ✅

1. **Use descriptive names**
   ```typescript
   // ✅ GOOD
   const router = new Router("Route Orders by Priority");
   const handler = new Component("CMP_ProcessHighPriority", "High Priority Handler", ...);
   
   // ❌ BAD
   const r = new Router("Router");
   const c = new Component("C1", "Component", ...);
   ```

2. **Generate unique IDs**
   ```typescript
   // ✅ GOOD
   const id1 = `CMP_${Date.now()}`;
   const id2 = `Router_${Date.now() + 1}`;
   
   // ❌ BAD
   const id1 = "CMP_1";
   const id2 = "CMP_1";  // Duplicate!
   ```

3. **Match router routes to connections**
   ```typescript
   // ✅ GOOD
   router.when("A").when("B").otherwise();
   flow.connect(router, targetA);
   flow.connect(router, targetB);
   flow.connect(router, targetDefault);
   // 3 routes = 3 connections
   ```

4. **Always pair GroovyScript with GroovyResource**
   ```typescript
   // ✅ GOOD
   const script = new GroovyScript("Transform", "transform.groovy");
   const resource = new GroovyResource("transform.groovy", content);
   flow.addComponent(script);
   flow.addResource(resource);
   ```

5. **Use SAP expression syntax**
   ```typescript
   // ✅ GOOD
   router.when("${header.Country} = 'IN'");
   
   // ❌ BAD
   router.when("${header.Country} == 'IN'");  // Wrong: == instead of =
   ```

### DON'T ❌

1. **Don't generate XML**
   ```typescript
   // ❌ NEVER DO THIS
   const xml = `<bpmn2:process>...</bpmn2:process>`;
   ```

2. **Don't use compiler internals**
   ```typescript
   // ❌ NEVER DO THIS
   const node = new BpmnNode(...);
   const mapper = new ComponentMapper();
   ```

3. **Don't hardcode SAP metadata**
   ```typescript
   // ❌ NEVER DO THIS
   const comp = new Component("C1", "Name", "Enricher", {
       cmdVariantUri: "ctype::FlowstepVariant/..."  // Registry handles this!
   });
   ```

4. **Don't create custom component types**
   ```typescript
   // ❌ NEVER DO THIS
   const comp = new Component("C1", "Name", "MyCustomType", {});
   
   // ✅ USE ONLY: Enricher, Router, ScriptCollection
   ```

---

## Validation Checklist

Before returning generated code, verify:

- [ ] IFlow created with non-empty name
- [ ] All component IDs are unique
- [ ] All components added to flow before connecting
- [ ] Router routes match connection count
- [ ] GroovyScript has matching GroovyResource
- [ ] No duplicate resource names
- [ ] SAP expression syntax (single `=`, not `==`)
- [ ] Required properties present for each component type
- [ ] Code includes necessary imports
- [ ] Code exports flow at end

---

## Response Template

When generating Integration Flow code:

```typescript
/**
 * Integration Flow: {Flow Name}
 * Generated from prompt: "{original user prompt}"
 * 
 * Components:
 * - {Component 1}: {Purpose}
 * - {Component 2}: {Purpose}
 * 
 * Flow: {High-level flow description}
 */

import { IFlow, Component, Router, GroovyScript, GroovyResource } from 'sap-integration-sdk';

const flow = new IFlow("{FlowName}");

// ... component creation ...
// ... connections ...

export default flow;
```

---

**END OF AI DEVELOPER GUIDE**
