# SAP Integration SDK Specification
## Version 1.3 - AI-First SDK

**Date**: 2026-08-04  
**Status**: STABLE  
**Target**: AI/LLM Integration Flow Generation

---

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [Component Catalog](#component-catalog)
5. [Fluent API Patterns](#fluent-api-patterns)
6. [Validation Rules](#validation-rules)
7. [AI Usage Guidelines](#ai-usage-guidelines)
8. [Anti-Patterns](#anti-patterns)

---

## Introduction

### Purpose

This SDK enables **programmatic generation of SAP Cloud Integration (CPI) Integration Flows** using TypeScript. It is designed as an **AI-first interface** where LLMs can generate valid Integration Flows from natural language without knowledge of BPMN or SAP internals.

### Design Principles

1. **Metadata-Driven**: All SAP-specific knowledge in Registry, not SDK
2. **Type-Safe**: TypeScript provides compile-time validation
3. **Fluent API**: Method chaining for readable flow construction
4. **Validation-First**: Errors detected before ZIP generation
5. **AI-Friendly**: Clear contracts, consistent patterns, helpful errors

### SDK Layers

```
┌─────────────────────────────────────┐
│  Natural Language Prompt            │
│  "Create flow that transforms       │
│   orders using Groovy script"       │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  SDK Layer (AI Interface)           │ ← THIS DOCUMENT
│  IFlow, Component, Router, etc.     │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Compiler Core (Frozen)             │
│  Mapper → IR → Writers → XML        │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  Output: RouterDemo.zip             │
│  Valid SAP Integration Flow         │
└─────────────────────────────────────┘
```

**AI Boundary**: The SDK is the ONLY interface AI needs to understand. Compiler internals are opaque.

---

## Architecture Overview

### Component Model

Every Integration Flow consists of:

1. **IFlow**: Container for the entire flow
2. **Components**: Processing steps (Content Modifier, Router, Groovy Script)
3. **Connections**: Links between components (sequence flows)
4. **Resources**: External files (Groovy scripts, mappings, schemas)

### Construction Pattern

```typescript
// 1. Create flow
const flow = new IFlow("FlowName");

// 2. Add components
const router = new Router("Route Orders");
const processA = new Component("CMP_A", "Process A", "Enricher", {...});

flow.addComponent(router);
flow.addComponent(processA);

// 3. Connect components
flow.connect(router, processA);

// 4. Add resources (if needed)
const script = new GroovyResource("transform.groovy", content);
flow.addResource(script);

// 5. Generate ZIP
const mapper = new BpmnProcessMapper();
const definitions = mapper.map(flow);
// ... serialization ...
```

### Validation Checkpoints

1. **Construction**: Type system prevents invalid SDK usage
2. **Pre-Compilation**: Validation engine checks flow structure
3. **Compilation**: Mapper validates component metadata
4. **Serialization**: Writers validate BPMN structure

---

## Core Components

### 1. IFlow

**Purpose**: Container representing an entire Integration Flow.

**Constructor**:
```typescript
new IFlow(name: string)
```

**Parameters**:
- `name` (string): Integration Flow name (displayed in SAP UI)
  - **Constraints**: 1-200 characters, no special chars except spaces, dash, underscore
  - **Example**: "Order Processing Flow", "SAP-to-S3-Sync"

**Public API**:

```typescript
class IFlow {
    // Add component to flow
    addComponent(component: Component): IFlow

    // Connect two components
    connect(from: Component, to: Component): IFlow

    // Add resource (script, mapping, etc.)
    addResource(resource: Resource): IFlow

    // Getters (mostly for internal use)
    getComponents(): Component[]
    getConnections(): Connection[]
    getResources(): Resource[]
}
```

**Fluent API**:
```typescript
const flow = new IFlow("MyFlow")
    .addComponent(componentA)
    .addComponent(componentB)
    .connect(componentA, componentB);
```

**Required Properties**:
- Name must be provided at construction

**Optional Properties**:
- None (IFlow has no optional properties)

**Validation Rules**:
1. ✓ Flow name must be non-empty
2. ✓ Flow name must be ≤200 characters
3. ✓ Components must be added before being connected
4. ✓ Connections must reference existing components
5. ✓ Flow must have at least one component (enforced at compilation)
6. ✓ No duplicate component IDs
7. ✓ No circular connections (A→B→A)

**AI Usage Hints**:
- **Always** create IFlow first
- **Always** add components before connecting them
- Component order in addComponent() doesn't matter (connections define flow)
- Use meaningful flow names (user will see this in SAP UI)

**Examples**:

```typescript
// ✅ CORRECT: Add components, then connect
const flow = new IFlow("Order Processing");
const router = new Router("Route by Country");
const processIN = new Component("CMP_1", "Process India", "Enricher", {});

flow.addComponent(router);
flow.addComponent(processIN);
flow.connect(router, processIN);
```

**Anti-Patterns**:

```typescript
// ❌ WRONG: Empty flow name
const flow = new IFlow("");

// ❌ WRONG: Connecting before adding
flow.connect(componentA, componentB);  // componentA not added yet!

// ❌ WRONG: Duplicate component IDs
const comp1 = new Component("CMP_1", "A", "Enricher", {});
const comp2 = new Component("CMP_1", "B", "Enricher", {});  // Same ID!
```

---

### 2. Component

**Purpose**: Generic representation of any SAP integration component. Base class for all processing steps.

**Constructor**:
```typescript
new Component(
    id: string,
    name: string,
    componentType: string,
    properties: Record<string, any> = {}
)
```

**Parameters**:
- `id` (string): Unique component identifier
  - **Pattern**: Alphanumeric + underscore, e.g., "CMP_1", "Router_OrderType"
  - **Constraints**: Must be unique within flow
  - **AI Hint**: Use descriptive IDs like "Router_Country" not "C1"

- `name` (string): Human-readable component name
  - **Displayed in**: SAP Integration Suite visual editor
  - **Example**: "Process India Orders", "Transform to JSON"

- `componentType` (string): Determines SAP component type
  - **Values**: See [Component Type Registry](#component-type-registry)
  - **Example**: "Enricher", "Router", "ScriptCollection"

- `properties` (Record<string, any>): Component-specific configuration
  - **Structure**: Key-value pairs matching SAP property requirements
  - **Validation**: Each componentType has required/optional properties

**Public API**:
```typescript
class Component {
    readonly id: string;
    readonly name: string;
    readonly componentType: string;
    readonly properties: Record<string, any>;
}
```

**Component Type Registry**:

| Component Type | Purpose | Required Properties | Optional Properties |
|----------------|---------|---------------------|---------------------|
| `Enricher` | Content Modifier | `body` OR `headerTable` OR `propertyTable` | `bodyType`, `wrapContent` |
| `Router` | Exclusive Gateway | None (routes defined via Router class) | None |
| `ScriptCollection` | Groovy Script | `script` (filename) | `description` |

**Validation Rules**:
1. ✓ ID must be non-empty and unique
2. ✓ Name must be non-empty
3. ✓ componentType must be registered in Registry
4. ✓ Required properties must be present
5. ✓ Property values must match expected types

**AI Usage Hints**:
- Use **specialized classes** (Router, GroovyScript) when available
- Use **Component directly** only for Content Modifier (Enricher)
- Generate unique IDs using pattern: `{Type}_{Timestamp}` or `{Type}_{Index}`
- **Name should describe what the component does**, not repeat the type

**Examples**:

```typescript
// ✅ CORRECT: Content Modifier with body
const modifier = new Component(
    "CMP_SetMessage",
    "Set Welcome Message",
    "Enricher",
    { body: "Welcome to SAP!" }
);

// ✅ CORRECT: Content Modifier with headers
const setHeaders = new Component(
    "CMP_AddCountry",
    "Add Country Header",
    "Enricher",
    {
        headerTable: {
            Country: "IN",
            Environment: "PROD"
        }
    }
);
```

**Anti-Patterns**:

```typescript
// ❌ WRONG: Empty required property
const bad = new Component("C1", "Modify", "Enricher", {});
// Missing required property: body OR headerTable OR propertyTable

// ❌ WRONG: Using Component for Router (use Router class instead)
const badRouter = new Component("R1", "Route", "Router", {});

// ❌ WRONG: Non-descriptive names
const bad = new Component("C1", "Component 1", "Enricher", {...});
// Should be: "Set Order Status" or "Add Tracking Headers"
```

---

### 3. Router

**Purpose**: Conditional routing component that splits message flow based on expressions.

**Constructor**:
```typescript
new Router(
    name: string,
    properties: Record<string, any> = {}
)
```

**Parameters**:
- `name` (string): Router name (e.g., "Route by Order Type")
- `properties` (optional): Additional SAP properties

**Public API**:
```typescript
class Router extends Component {
    // Define conditional route
    when(condition: string): this

    // Define default route
    otherwise(): this

    // Get all routes
    getRoutes(): Route[]

    // Get default route
    getDefaultRoute(): Route | undefined
}
```

**Fluent API**:
```typescript
const router = new Router("Route Orders");

// Define routes (conditions)
router
    .when("${header.orderType} = 'urgent'")
    .when("${header.orderType} = 'standard'")
    .otherwise();

// Add to flow
flow.addComponent(router);

// Create route targets
const urgentHandler = new Component(...);
const standardHandler = new Component(...);
const defaultHandler = new Component(...);

// Connect router to targets
flow.connect(router, urgentHandler);    // Route 1: urgent
flow.connect(router, standardHandler);  // Route 2: standard
flow.connect(router, defaultHandler);   // Route 3: default (otherwise)
```

**Required Properties**:
- At least ONE route must be defined (via `.when()` or `.otherwise()`)

**Optional Properties**:
- None (routes are defined via fluent API)

**Validation Rules**:
1. ✓ Router must have at least 1 route
2. ✓ Router can have at most 1 default route (`.otherwise()`)
3. ✓ Each `.when()` condition must be non-empty
4. ✓ Number of connections FROM router must match number of routes
5. ✓ Condition syntax must be valid SAP expression: `${header.X} = 'value'`
6. ✓ One route should be marked as default (`.otherwise()`)

**Condition Expression Syntax**:

SAP uses **Simple Expression Language**:

```typescript
// ✅ CORRECT: SAP syntax (single =, single quotes)
"${header.Country} = 'IN'"
"${property.OrderType} = 'urgent'"
"${header.Amount} > 1000"

// ❌ WRONG: JavaScript syntax
"${header.Country} == 'IN'"    // Use single =, not ==
"${header.Country} === 'IN'"   // Use single =, not ===
`${header.Country} = "IN"`     // Use single quotes, not double
```

**AI Usage Hints**:
- **Define routes** using `.when()` and `.otherwise()` immediately after construction
- **Number of connections** from router must equal number of routes
- **Order matters**: First connection matches first `.when()`, second matches second `.when()`, etc.
- **Default route** (`.otherwise()`) should be the last connection
- Use **meaningful condition expressions** that match business logic

**Examples**:

```typescript
// ✅ CORRECT: Router with conditions and connections
const router = new Router("Route by Priority");

router
    .when("${header.priority} = 'high'")
    .otherwise();

flow.addComponent(router);

const highPriorityHandler = new Component("CMP_High", "Process High Priority", "Enricher", {...});
const defaultHandler = new Component("CMP_Default", "Process Normal", "Enricher", {...});

flow.addComponent(highPriorityHandler);
flow.addComponent(defaultHandler);

flow.connect(router, highPriorityHandler);  // Matches first .when()
flow.connect(router, defaultHandler);       // Matches .otherwise()
```

**Anti-Patterns**:

```typescript
// ❌ WRONG: No routes defined
const router = new Router("Empty Router");
flow.addComponent(router);
flow.connect(router, target);  // ERROR: No routes defined!

// ❌ WRONG: Wrong number of connections
router.when("${header.type} = 'A'").when("${header.type} = 'B'");
flow.connect(router, targetA);  // Missing connection for route B!

// ❌ WRONG: Invalid condition syntax
router.when("${header.Country} == 'IN'");  // Should be single =

// ❌ WRONG: Multiple otherwise()
router.when("...").otherwise().otherwise();  // Only one default allowed!
```

---

### 4. GroovyScript

**Purpose**: Execute Groovy code to transform message content or implement custom logic.

**Constructor**:
```typescript
new GroovyScript(
    name: string,
    scriptName: string,
    additionalProperties: Record<string, any> = {}
)
```

**Parameters**:
- `name` (string): Component name (e.g., "Transform Order XML")
- `scriptName` (string): Groovy script filename (e.g., "transform.groovy")
  - **Constraints**: Must end with `.groovy`
  - **Path**: Filename only, NOT full path
  - **Location**: Script packaged in `src/main/resources/script/` automatically
- `additionalProperties` (optional): Additional SAP properties

**Public API**:
```typescript
class GroovyScript extends Component {
    getScriptName(): string
    getScriptReference(): string  // Returns "script/{filename}"
}
```

**Required Properties**:
- Script file must be added as a `GroovyResource` to the flow

**Validation Rules**:
1. ✓ scriptName must end with `.groovy`
2. ✓ Corresponding GroovyResource must be added to flow
3. ✓ Script filename must match between GroovyScript and GroovyResource

**AI Usage Hints**:
- **Always pair with GroovyResource**: Create both GroovyScript component AND GroovyResource
- **Script content**: Can be inline string or file path
- **Use for**: Complex transformations, conditional logic, data enrichment
- **Don't use for**: Simple header/body modifications (use Content Modifier instead)

**Examples**:

```typescript
// ✅ CORRECT: Groovy script with resource
const scriptContent = `
import com.sap.gateway.ip.core.customdev.util.Message;

def Message processData(Message message) {
    def body = message.getBody(String.class);
    // Transform logic here
    message.setBody(transformedBody);
    return message;
}
`;

// 1. Create script component
const transform = new GroovyScript(
    "Transform Order",
    "transformOrder.groovy"
);

// 2. Create script resource
const scriptFile = new GroovyResource(
    "transformOrder.groovy",
    scriptContent
);

// 3. Add both to flow
flow.addComponent(transform);
flow.addResource(scriptFile);

// 4. Connect
flow.connect(previousStep, transform);
```

**Anti-Patterns**:

```typescript
// ❌ WRONG: Script component without resource
const script = new GroovyScript("Transform", "missing.groovy");
flow.addComponent(script);
// ERROR: No matching GroovyResource added!

// ❌ WRONG: Filename mismatch
const script = new GroovyScript("Transform", "transform.groovy");
const resource = new GroovyResource("different.groovy", content);
// ERROR: Filenames don't match!

// ❌ WRONG: Full path in scriptName
const script = new GroovyScript("Transform", "src/main/resources/script/transform.groovy");
// Should be just: "transform.groovy"
```

---

### 5. GroovyResource

**Purpose**: Represents a Groovy script file to be packaged with the Integration Flow.

**Constructor**:
```typescript
new GroovyResource(
    name: string,
    content: string | Buffer,
    path?: string
)
```

**Parameters**:
- `name` (string): Script filename (e.g., "transform.groovy")
- `content` (string | Buffer): Script content (inline code or file buffer)
- `path` (optional string): Filesystem path to read script from

**Public API**:
```typescript
class GroovyResource implements Resource {
    readonly name: string;
    readonly type: "groovy";

    getContent(): Promise<string | Buffer>
    getPackagePath(): string  // Returns "src/main/resources/script/{name}"
}
```

**Required Properties**:
- name must end with `.groovy`
- content OR path must be provided

**Validation Rules**:
1. ✓ name must end with `.groovy`
2. ✓ content must be non-empty (if inline)
3. ✓ path must exist (if using file path)
4. ✓ name must match GroovyScript component

**AI Usage Hints**:
- **Inline content**: Use for short scripts or AI-generated code
- **File path**: Use when script already exists on disk
- **Script structure**: Must implement `processData(Message)` method
- **Imports**: Include necessary SAP imports

**Examples**:

```typescript
// ✅ CORRECT: Inline content
const script = new GroovyResource(
    "transform.groovy",
    `
    import com.sap.gateway.ip.core.customdev.util.Message;
    
    def Message processData(Message message) {
        def body = message.getBody(String.class);
        message.setHeader("Processed", "true");
        return message;
    }
    `
);

// ✅ CORRECT: From file
const script = new GroovyResource(
    "transform.groovy",
    undefined,  // no inline content
    "./scripts/transform.groovy"  // read from file
);
```

---

### 6. Connection

**Purpose**: Represents a sequence flow between two components.

**Constructor**:
```typescript
new Connection(from: Component, to: Component)
```

**Note**: Typically created via `IFlow.connect()`, not directly.

**AI Usage Hints**:
- **Don't create directly**: Use `flow.connect(from, to)` instead
- Connection order defines flow execution order
- Router connections must match route count

---

## Component Catalog

### Available Components (v1.3)

| Component | Class | Purpose | Status |
|-----------|-------|---------|--------|
| Content Modifier | `Component("Enricher")` | Set body, headers, properties | ✅ Stable |
| Router | `Router` | Conditional routing | ✅ Stable |
| Groovy Script | `GroovyScript` | Custom transformation logic | ✅ Stable |

### Component Decision Tree

```
User prompt mentions...
├─ "modify", "set", "add header", "change body"
│  └─> Use Component with "Enricher"
│
├─ "route", "conditional", "if-then", "split by"
│  └─> Use Router
│
├─ "transform", "convert", "complex logic", "script"
│  └─> Use GroovyScript (+ GroovyResource)
│
└─ Other SAP components
   └─> Not yet supported - inform user
```

---

## Fluent API Patterns

### Pattern 1: Simple Linear Flow

```typescript
const flow = new IFlow("Simple Flow")
    .addComponent(componentA)
    .addComponent(componentB)
    .connect(componentA, componentB);
```

### Pattern 2: Router Flow

```typescript
const router = new Router("Route by Type");
router.when("${header.type} = 'A'").otherwise();

const flow = new IFlow("Router Flow")
    .addComponent(router)
    .addComponent(handlerA)
    .addComponent(handlerB)
    .connect(router, handlerA)
    .connect(router, handlerB);
```

### Pattern 3: Flow with Resources

```typescript
const script = new GroovyScript("Transform", "transform.groovy");
const resource = new GroovyResource("transform.groovy", scriptContent);

const flow = new IFlow("Transform Flow")
    .addComponent(script)
    .addResource(resource);
```

---

## Validation Rules

See [VALIDATION_RULES.md](VALIDATION_RULES.md) for complete validation specification.

**Summary**:
1. ✓ Flow must have non-empty name
2. ✓ Components must have unique IDs
3. ✓ Connections reference existing components
4. ✓ Router routes match connection count
5. ✓ GroovyScript has matching GroovyResource
6. ✓ Required component properties present
7. ✓ No circular connections

---

## AI Usage Guidelines

### Code Generation Workflow

```
1. Parse natural language prompt
   ↓
2. Identify required components
   ↓
3. Generate TypeScript SDK code
   ↓
4. Validate against SDK rules
   ↓
5. Return code to user
```

### Error Handling Strategy

```typescript
// When validation fails, provide:
// 1. What went wrong
// 2. Where it went wrong
// 3. How to fix it

❌ Bad error: "Invalid flow"

✅ Good error: "Router 'Route_1' has 2 routes defined but only 1 connection. 
               Add one more connection: flow.connect(router, targetB)"
```

### Prompt Interpretation Guidelines

| User Says | AI Generates |
|-----------|--------------|
| "Create flow" | `new IFlow("...")` |
| "Add component to modify body" | `new Component(..., "Enricher", {body: "..."})` |
| "Add router that checks country" | `new Router("...").when("${header.Country} = '...'")` |
| "Add script to transform" | `new GroovyScript(...) + new GroovyResource(...)` |
| "Connect A to B" | `flow.connect(A, B)` |

---

## Anti-Patterns

### ❌ Don't: Generate XML Directly

```typescript
// WRONG: AI should NEVER generate XML
const xml = `<bpmn2:process>...</bpmn2:process>`;
```

### ❌ Don't: Use Compiler Internals

```typescript
// WRONG: Don't use BpmnNode, BpmnProcessMapper directly
const node = new BpmnNode("id", "callActivity", "name");
```

### ❌ Don't: Hardcode Component IDs

```typescript
// WRONG: Non-unique IDs
const comp1 = new Component("CMP_1", ...);
const comp2 = new Component("CMP_1", ...);  // Duplicate!

// RIGHT: Unique IDs
const comp1 = new Component(`CMP_${Date.now()}`, ...);
const comp2 = new Component(`CMP_${Date.now() + 1}`, ...);
```

### ❌ Don't: Mix Router Patterns

```typescript
// WRONG: Using Component for Router
const router = new Component("R1", "Router", "Router", {});

// RIGHT: Use Router class
const router = new Router("Router").when("...").otherwise();
```

---

## Next Steps

1. Review [AI_DEVELOPER_GUIDE.md](AI_DEVELOPER_GUIDE.md) for detailed AI integration
2. Check [VALIDATION_RULES.md](VALIDATION_RULES.md) for validation engine spec
3. See [PROMPT_TEST_SUITE.md](PROMPT_TEST_SUITE.md) for test cases
4. Consult [AI_COMPONENT_METADATA.md](AI_COMPONENT_METADATA.md) for machine-readable metadata

---

**END OF SDK SPECIFICATION**
