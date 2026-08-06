# SAP Integration SDK - Validation Rules
## Version 1.3

**Purpose**: Comprehensive validation rules for detecting invalid SDK usage before ZIP generation.

---

## Table of Contents

1. [Validation Architecture](#validation-architecture)
2. [Rule Categories](#rule-categories)
3. [IFlow Validation](#iflow-validation)
4. [Component Validation](#component-validation)
5. [Router Validation](#router-validation)
6. [GroovyScript Validation](#groovyscript-validation)
7. [Connection Validation](#connection-validation)
8. [Resource Validation](#resource-validation)
9. [Error Messages](#error-messages)
10. [Validation Engine API](#validation-engine-api)

---

## Validation Architecture

### Validation Phases

```
┌──────────────────────────┐
│ 1. Type Validation       │  ← TypeScript compiler
│    (compile-time)        │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 2. Structural Validation │  ← Validation Engine
│    (pre-compilation)     │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 3. Semantic Validation   │  ← ComponentMapper
│    (compilation)         │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ 4. BPMN Validation       │  ← Writers
│    (serialization)       │
└──────────────────────────┘
```

### Validation Levels

| Level | When | What | Fixable By |
|-------|------|------|------------|
| ERROR | Always stops compilation | Critical structural issues | AI/User |
| WARNING | Compilation continues | Potential issues, suboptimal patterns | AI/User |
| INFO | Logged only | Suggestions, best practices | Optional |

---

## Rule Categories

| Category | Rules | Priority |
|----------|-------|----------|
| Naming | Flow name, component names | Medium |
| Uniqueness | Component IDs, resource names | **High** |
| Existence | Referenced components exist | **High** |
| Connectivity | Valid connections, no orphans | **High** |
| Cardinality | Router routes match connections | **High** |
| Properties | Required properties present | **High** |
| Syntax | Condition expressions valid | Medium |
| Pairing | GroovyScript ↔ GroovyResource | **High** |
| Circularity | No circular dependencies | Medium |

---

## IFlow Validation

### Rule IF-001: Flow Name Required

**Level**: ERROR  
**Check**: Flow name must be non-empty string  

```typescript
// ❌ INVALID
const flow = new IFlow("");

// ✅ VALID
const flow = new IFlow("Order Processing");
```

**Error Message**:
```
ERROR IF-001: Flow name cannot be empty
→ Fix: Provide a non-empty string to IFlow constructor
→ Example: new IFlow("My Integration Flow")
```

---

### Rule IF-002: Flow Name Length

**Level**: WARNING  
**Check**: Flow name should be 1-200 characters  

```typescript
// ⚠️ WARNING
const flow = new IFlow("A".repeat(201));

// ✅ VALID
const flow = new IFlow("Order Processing Flow");
```

**Error Message**:
```
WARNING IF-002: Flow name exceeds 200 characters (current: 201)
→ Suggestion: Use shorter, descriptive name
→ Long names may be truncated in SAP UI
```

---

### Rule IF-003: Component Uniqueness

**Level**: ERROR  
**Check**: All component IDs must be unique within flow  

```typescript
// ❌ INVALID
const compA = new Component("CMP_1", "A", "Enricher", {});
const compB = new Component("CMP_1", "B", "Enricher", {});
flow.addComponent(compA);
flow.addComponent(compB);

// ✅ VALID
const compA = new Component("CMP_1", "A", "Enricher", {});
const compB = new Component("CMP_2", "B", "Enricher", {});
```

**Error Message**:
```
ERROR IF-003: Duplicate component ID 'CMP_1'
→ Component 'A' (Enricher) at position 0
→ Component 'B' (Enricher) at position 1
→ Fix: Ensure each component has a unique ID
→ Suggestion: Use pattern {Type}_{Timestamp} or {Type}_{Index}
```

---

### Rule IF-004: Minimum Components

**Level**: ERROR  
**Check**: Flow must have at least one component  

```typescript
// ❌ INVALID
const flow = new IFlow("Empty Flow");
// No components added

// ✅ VALID
const flow = new IFlow("Simple Flow");
flow.addComponent(new Component(...));
```

**Error Message**:
```
ERROR IF-004: Flow 'Empty Flow' has no components
→ Fix: Add at least one component using flow.addComponent()
→ Example: flow.addComponent(new Component(...))
```

---

### Rule IF-005: Resource Name Uniqueness

**Level**: ERROR  
**Check**: All resource names must be unique within flow  

```typescript
// ❌ INVALID
flow.addResource(new GroovyResource("transform.groovy", content1));
flow.addResource(new GroovyResource("transform.groovy", content2));

// ✅ VALID
flow.addResource(new GroovyResource("transform1.groovy", content1));
flow.addResource(new GroovyResource("transform2.groovy", content2));
```

**Error Message**:
```
ERROR IF-005: Duplicate resource name 'transform.groovy'
→ Resource 'transform.groovy' (groovy) at position 0
→ Resource 'transform.groovy' (groovy) at position 1
→ Fix: Each resource must have a unique filename
```

---

## Component Validation

### Rule CMP-001: Component ID Format

**Level**: WARNING  
**Check**: Component ID should follow naming convention  

**Pattern**: `^[A-Za-z0-9_]+$` (alphanumeric + underscore)

```typescript
// ⚠️ WARNING
const comp = new Component("comp-1", "Test", "Enricher", {});
const comp = new Component("comp.1", "Test", "Enricher", {});

// ✅ VALID
const comp = new Component("CMP_1", "Test", "Enricher", {});
const comp = new Component("Router_OrderType", "Test", "Router", {});
```

**Error Message**:
```
WARNING CMP-001: Component ID 'comp-1' contains special characters
→ Recommended pattern: {Type}_{Identifier}
→ Valid characters: A-Z, a-z, 0-9, underscore
→ Examples: CMP_1, Router_Country, Script_Transform
```

---

### Rule CMP-002: Component Name Required

**Level**: ERROR  
**Check**: Component name must be non-empty  

```typescript
// ❌ INVALID
const comp = new Component("CMP_1", "", "Enricher", {});

// ✅ VALID
const comp = new Component("CMP_1", "Set Order Status", "Enricher", {});
```

**Error Message**:
```
ERROR CMP-002: Component 'CMP_1' has empty name
→ Fix: Provide descriptive name
→ Name is displayed in SAP Integration Suite UI
```

---

### Rule CMP-003: ComponentType Registered

**Level**: ERROR  
**Check**: componentType must exist in Registry  

```typescript
// ❌ INVALID
const comp = new Component("CMP_1", "Test", "UnknownType", {});

// ✅ VALID
const comp = new Component("CMP_1", "Test", "Enricher", {});
```

**Error Message**:
```
ERROR CMP-003: Unknown component type 'UnknownType' for component 'CMP_1'
→ Valid types: Enricher, Router, ScriptCollection
→ Fix: Use one of the registered component types
```

---

### Rule CMP-004: Required Properties Present

**Level**: ERROR  
**Check**: Component must have required properties for its type  

```typescript
// ❌ INVALID (Enricher requires body OR headerTable OR propertyTable)
const comp = new Component("CMP_1", "Modify", "Enricher", {});

// ✅ VALID
const comp = new Component("CMP_1", "Set Body", "Enricher", {
    body: "Hello World"
});
```

**Error Message**:
```
ERROR CMP-004: Component 'CMP_1' (Enricher) missing required properties
→ Type 'Enricher' requires ONE OF: body, headerTable, propertyTable
→ Fix: Add at least one required property
→ Example: { body: "message content" }
```

---

## Router Validation

### Rule RTR-001: Routes Defined

**Level**: ERROR  
**Check**: Router must have at least one route defined  

```typescript
// ❌ INVALID
const router = new Router("Route Orders");
// No routes defined

// ✅ VALID
const router = new Router("Route Orders");
router.when("${header.type} = 'A'");
```

**Error Message**:
```
ERROR RTR-001: Router 'Route Orders' has no routes defined
→ Fix: Define at least one route using .when() or .otherwise()
→ Example: router.when("${header.Country} = 'IN'")
```

---

### Rule RTR-002: Route Condition Non-Empty

**Level**: ERROR  
**Check**: Each `.when()` condition must be non-empty  

```typescript
// ❌ INVALID
router.when("");

// ✅ VALID
router.when("${header.Country} = 'IN'");
```

**Error Message**:
```
ERROR RTR-002: Router 'Route Orders' has empty condition in route 1
→ Fix: Provide valid condition expression
→ Example: "${header.Country} = 'IN'"
```

---

### Rule RTR-003: Route Connection Cardinality

**Level**: ERROR  
**Check**: Number of connections FROM router must equal number of routes  

```typescript
// ❌ INVALID
router.when("${header.type} = 'A'").when("${header.type} = 'B'");
flow.connect(router, targetA);  // Only 1 connection, need 2!

// ✅ VALID
router.when("${header.type} = 'A'").when("${header.type} = 'B'");
flow.connect(router, targetA);
flow.connect(router, targetB);
```

**Error Message**:
```
ERROR RTR-003: Router 'Route Orders' route mismatch
→ Routes defined: 2 (.when() calls)
→ Connections from router: 1
→ Fix: Add 1 more connection from this router
→ Example: flow.connect(router, targetComponent)
```

---

### Rule RTR-004: Single Default Route

**Level**: ERROR  
**Check**: Router can have at most one `.otherwise()` call  

```typescript
// ❌ INVALID
router.when("...").otherwise().otherwise();

// ✅ VALID
router.when("...").otherwise();
```

**Error Message**:
```
ERROR RTR-004: Router 'Route Orders' has multiple default routes
→ .otherwise() called 2 times
→ Fix: Remove duplicate .otherwise() calls
→ Only one default route allowed per router
```

---

### Rule RTR-005: Condition Syntax

**Level**: WARNING  
**Check**: Condition expression should use SAP syntax  

```typescript
// ⚠️ WARNING (using == instead of =)
router.when("${header.Country} == 'IN'");

// ✅ VALID
router.when("${header.Country} = 'IN'");
```

**Error Message**:
```
WARNING RTR-005: Router 'Route Orders' route 1 condition uses incorrect syntax
→ Condition: "${header.Country} == 'IN'"
→ SAP uses single = for comparison, not ==
→ Fix: Change '==' to '='
→ Corrected: "${header.Country} = 'IN'"
```

---

## GroovyScript Validation

### Rule GS-001: Script Filename Extension

**Level**: ERROR  
**Check**: scriptName must end with `.groovy`  

```typescript
// ❌ INVALID
const script = new GroovyScript("Transform", "transform.js");

// ✅ VALID
const script = new GroovyScript("Transform", "transform.groovy");
```

**Error Message**:
```
ERROR GS-001: GroovyScript 'Transform' has invalid script filename
→ Filename: 'transform.js'
→ Fix: Script filename must end with .groovy
→ Example: 'transform.groovy'
```

---

### Rule GS-002: Matching Resource Required

**Level**: ERROR  
**Check**: GroovyScript must have matching GroovyResource in flow  

```typescript
// ❌ INVALID
const script = new GroovyScript("Transform", "transform.groovy");
flow.addComponent(script);
// Missing GroovyResource!

// ✅ VALID
const script = new GroovyScript("Transform", "transform.groovy");
const resource = new GroovyResource("transform.groovy", content);
flow.addComponent(script);
flow.addResource(resource);
```

**Error Message**:
```
ERROR GS-002: GroovyScript 'Transform' missing matching resource
→ Script references: 'transform.groovy'
→ Available resources: []
→ Fix: Add matching GroovyResource to flow
→ Example: flow.addResource(new GroovyResource("transform.groovy", content))
```

---

### Rule GS-003: Filename Match

**Level**: ERROR  
**Check**: GroovyScript scriptName must match GroovyResource name  

```typescript
// ❌ INVALID
const script = new GroovyScript("Transform", "transform.groovy");
const resource = new GroovyResource("different.groovy", content);

// ✅ VALID
const script = new GroovyScript("Transform", "transform.groovy");
const resource = new GroovyResource("transform.groovy", content);
```

**Error Message**:
```
ERROR GS-003: GroovyScript 'Transform' filename mismatch
→ Script references: 'transform.groovy'
→ Resource filename: 'different.groovy'
→ Fix: Ensure filenames match exactly
```

---

## Connection Validation

### Rule CON-001: Component Exists

**Level**: ERROR  
**Check**: Connected components must exist in flow  

```typescript
// ❌ INVALID
const compA = new Component(...);
const compB = new Component(...);
flow.addComponent(compA);
// compB not added!
flow.connect(compA, compB);

// ✅ VALID
flow.addComponent(compA);
flow.addComponent(compB);
flow.connect(compA, compB);
```

**Error Message**:
```
ERROR CON-001: Connection references unknown component
→ From: 'CMP_A' (exists)
→ To: 'CMP_B' (NOT in flow)
→ Fix: Add component to flow before connecting
→ Example: flow.addComponent(compB)
```

---

### Rule CON-002: No Self-Loops

**Level**: ERROR  
**Check**: Component cannot connect to itself  

```typescript
// ❌ INVALID
flow.connect(compA, compA);

// ✅ VALID
flow.connect(compA, compB);
```

**Error Message**:
```
ERROR CON-002: Self-loop detected
→ Component 'CMP_A' connects to itself
→ Fix: Connect to a different component
```

---

### Rule CON-003: No Circular Dependencies

**Level**: WARNING  
**Check**: Detect circular connection paths  

```typescript
// ⚠️ WARNING
flow.connect(compA, compB);
flow.connect(compB, compC);
flow.connect(compC, compA);  // Creates cycle A→B→C→A

// ✅ VALID (linear flow)
flow.connect(compA, compB);
flow.connect(compB, compC);
```

**Error Message**:
```
WARNING CON-003: Circular dependency detected
→ Path: CMP_A → CMP_B → CMP_C → CMP_A
→ This may cause infinite loops during execution
→ Fix: Remove one connection to break the cycle
```

---

### Rule CON-004: Orphaned Components

**Level**: WARNING  
**Check**: All components should be part of flow execution path  

```typescript
// ⚠️ WARNING
flow.addComponent(compA);
flow.addComponent(compB);
flow.addComponent(compC);
flow.connect(compA, compB);
// compC is orphaned!

// ✅ VALID
flow.connect(compA, compB);
flow.connect(compB, compC);
```

**Error Message**:
```
WARNING CON-004: Orphaned component detected
→ Component 'CMP_C' (Enricher) has no incoming or outgoing connections
→ This component will never execute
→ Fix: Connect this component or remove it
```

---

## Resource Validation

### Rule RES-001: Resource Name Required

**Level**: ERROR  
**Check**: Resource name must be non-empty  

```typescript
// ❌ INVALID
const resource = new GroovyResource("", content);

// ✅ VALID
const resource = new GroovyResource("transform.groovy", content);
```

**Error Message**:
```
ERROR RES-001: Resource has empty name
→ Fix: Provide non-empty filename
```

---

### Rule RES-002: Resource Content Required

**Level**: ERROR  
**Check**: Resource must have content OR path  

```typescript
// ❌ INVALID
const resource = new GroovyResource("transform.groovy");

// ✅ VALID
const resource = new GroovyResource("transform.groovy", content);
```

**Error Message**:
```
ERROR RES-002: Resource 'transform.groovy' has no content
→ Fix: Provide content parameter or path parameter
→ Example: new GroovyResource("file.groovy", "script content")
```

---

### Rule RES-003: Groovy File Extension

**Level**: ERROR  
**Check**: GroovyResource name must end with `.groovy`  

```typescript
// ❌ INVALID
const resource = new GroovyResource("transform.js", content);

// ✅ VALID
const resource = new GroovyResource("transform.groovy", content);
```

**Error Message**:
```
ERROR RES-003: GroovyResource filename must end with .groovy
→ Current filename: 'transform.js'
→ Fix: Change extension to .groovy
```

---

## Error Messages

### Error Message Format

```
{LEVEL} {RULE_ID}: {Short Description}
→ {Context Line 1}
→ {Context Line 2}
→ Fix: {How to fix}
→ Example: {Code example}
```

### Severity Levels

| Level | Symbol | Color | Action |
|-------|--------|-------|--------|
| ERROR | ❌ | Red | Stop compilation |
| WARNING | ⚠️ | Yellow | Continue with warning |
| INFO | ℹ️ | Blue | Log only |

---

## Validation Engine API

### ValidationEngine Class

```typescript
class ValidationEngine {
    // Validate entire flow
    validate(flow: IFlow): ValidationResult

    // Validate specific component
    validateComponent(component: Component): ValidationIssue[]

    // Validate connections
    validateConnections(flow: IFlow): ValidationIssue[]

    // Validate resources
    validateResources(flow: IFlow): ValidationIssue[]
}
```

### ValidationResult

```typescript
interface ValidationResult {
    valid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    infos: ValidationIssue[];
}
```

### ValidationIssue

```typescript
interface ValidationIssue {
    ruleId: string;           // e.g., "IF-003"
    level: "ERROR" | "WARNING" | "INFO";
    message: string;          // Short description
    details: string[];        // Context lines
    fix: string;              // How to fix
    example?: string;         // Code example
    location?: {              // Where the issue is
        component?: string;
        property?: string;
        line?: number;
    };
}
```

### Usage Example

```typescript
import { ValidationEngine } from './validation/ValidationEngine';

const flow = new IFlow("MyFlow");
// ... build flow ...

const validator = new ValidationEngine();
const result = validator.validate(flow);

if (!result.valid) {
    console.error("Validation failed:");
    result.errors.forEach(error => {
        console.error(`${error.ruleId}: ${error.message}`);
        error.details.forEach(detail => console.error(`  → ${detail}`));
        console.error(`  Fix: ${error.fix}`);
    });
    process.exit(1);
}

// Show warnings but continue
result.warnings.forEach(warning => {
    console.warn(`${warning.ruleId}: ${warning.message}`);
});
```

---

## Validation Rule Summary

| Rule ID | Description | Level | Category |
|---------|-------------|-------|----------|
| IF-001 | Flow name required | ERROR | IFlow |
| IF-002 | Flow name length | WARNING | IFlow |
| IF-003 | Component ID uniqueness | ERROR | IFlow |
| IF-004 | Minimum components | ERROR | IFlow |
| IF-005 | Resource name uniqueness | ERROR | IFlow |
| CMP-001 | Component ID format | WARNING | Component |
| CMP-002 | Component name required | ERROR | Component |
| CMP-003 | ComponentType registered | ERROR | Component |
| CMP-004 | Required properties | ERROR | Component |
| RTR-001 | Routes defined | ERROR | Router |
| RTR-002 | Route condition non-empty | ERROR | Router |
| RTR-003 | Route connection cardinality | ERROR | Router |
| RTR-004 | Single default route | ERROR | Router |
| RTR-005 | Condition syntax | WARNING | Router |
| GS-001 | Script filename extension | ERROR | GroovyScript |
| GS-002 | Matching resource required | ERROR | GroovyScript |
| GS-003 | Filename match | ERROR | GroovyScript |
| CON-001 | Component exists | ERROR | Connection |
| CON-002 | No self-loops | ERROR | Connection |
| CON-003 | No circular dependencies | WARNING | Connection |
| CON-004 | Orphaned components | WARNING | Connection |
| RES-001 | Resource name required | ERROR | Resource |
| RES-002 | Resource content required | ERROR | Resource |
| RES-003 | Groovy file extension | ERROR | Resource |

---

**Total Rules**: 24  
**ERROR Rules**: 17  
**WARNING Rules**: 7  

---

**END OF VALIDATION RULES**
