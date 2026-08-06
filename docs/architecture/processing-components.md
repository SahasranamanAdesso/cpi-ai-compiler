# Processing Component Family

## Overview

Most SAP Integration Suite processing components share the same BPMN structure:
- **BPMN Element**: `<bpmn2:callActivity>`
- **SAP Extension**: `<ifl:property>` metadata elements
- **Differentiation**: Metadata values (activityType, cmdVariantUri, configuration)

This compiler uses a metadata-driven approach to generate these components without duplication.

## Why This Matters

Before v1.2, adding a new processing component (Router, Groovy Script, etc.) would require:
1. Hardcoding component-specific logic in CallActivityWriter
2. Duplicating XML generation patterns
3. Risk of inconsistencies across components

After v1.2, adding a new processing component requires:
1. Add one Registry entry with metadata
2. That's it. No code changes.

## Architecture

### Registry-Driven Metadata

`ComponentRegistry` contains complete metadata for each component type:

```typescript
Enricher: {
    displayName: "Content Modifier",
    bpmnElement: "callActivity",
    activityType: "Enricher",
    metadata: {
        activityType: "Enricher",
        cmdVariantUri: "ctype::FlowstepVariant/cname::Enricher/version::1.6.3",
        componentVersion: "1.6",
        defaultProperties: {
            bodyType: "constant",
            propertyTable: "",
            headerTable: "",
            wrapContent: ""
        }
    }
}
```

**Metadata Fields**:

| Field | Purpose | Example |
|-------|---------|---------|
| `activityType` | SAP component type identifier | "Enricher", "Router", "ScriptCollection" |
| `cmdVariantUri` | SAP variant reference | "ctype::FlowstepVariant/cname::Enricher/version::1.6.3" |
| `componentVersion` | Component version | "1.6", "1.0", "1.2" |
| `defaultProperties` | Default configuration | `{ bodyType: "constant", ... }` |
| `resourceType` | External resource type (optional) | "groovy", "mapping", "xsd" |
| `resourceReference` | Resource path pattern (optional) | "script/{name}.groovy" |

### Data Flow

```
User Code (Domain Model)
    ↓
Component("CMP_1", "Content Modifier", "Enricher", { body: "Hello" })
    ↓
ComponentMapper.map()
    ├─ Registry.getByTechnicalName("Enricher")
    ├─ Merge metadata.defaultProperties with user properties
    ├─ Inject cmdVariantUri, componentVersion from metadata
    └─ Create BpmnNode with complete properties
    ↓
BpmnNode(id="CMP_1", type="callActivity", properties={
    activityType: "Enricher",
    cmdVariantUri: "ctype::FlowstepVariant/cname::Enricher/version::1.6.3",
    componentVersion: "1.6",
    bodyType: "constant",  // ← from defaultProperties
    body: "Hello",         // ← from user
    propertyTable: "",     // ← from defaultProperties
    headerTable: "",       // ← from defaultProperties
    wrapContent: ""        // ← from defaultProperties
})
    ↓
CallActivityWriter.write()
    ├─ Generate <bpmn2:callActivity>
    ├─ Generate <ifl:property> for EACH property
    └─ No hardcoding, no defaults
    ↓
Complete BPMN XML
```

### Generic CallActivityWriter

Single writer handles ALL processing components:

1. Reads properties from BpmnNode (already merged with metadata)
2. Generates common BPMN structure
3. Writes `<ifl:property>` elements for all properties
4. Adds optional resource references

**No hardcoded component logic.**

Before:
```typescript
// Hardcoded Enricher assumptions
const mandatoryProperties = {
    'activityType': properties.activityType || 'Enricher',
    'cmdVariantUri': properties.cmdVariantUri || 'ctype::FlowstepVariant/cname::Enricher/version::1.6.3',
    // ... more hardcoded defaults
};
```

After:
```typescript
// Generic approach - write exactly what's in properties
Object.entries(node.properties).forEach(([key, value]) => {
    // Write <ifl:property> with key/value
});
```

### Adding New Components

To add a new CallActivity-based component:

1. **Add Registry entry** with metadata:

```typescript
Router: {
    displayName: "Router",
    bpmnElement: "callActivity",
    activityType: "Router",
    metadata: {
        activityType: "Router",
        operation: "Route",
        cmdVariantUri: "ctype::FlowstepVariant/cname::Router/version::1.0.0",
        componentVersion: "1.0"
    }
}
```

2. **That's it.** No changes to:
   - ComponentMapper (already generic)
   - CallActivityWriter (already generic)
   - BpmnNode (already generic)
   - Serializer (already generic)
   - Packager (already generic)

3. **Use it immediately**:

```typescript
const router = new Component(
    "Router_1",
    "Route by Country",
    "Router",
    {
        condition: "${header.Country} == 'IN'",
        defaultRoute: "false"
    }
);
```

The compiler automatically:
- Injects `activityType: "Router"` from metadata
- Injects `cmdVariantUri` and `componentVersion` from metadata
- Generates correct BPMN XML

## Resource Abstraction

External resources (Groovy scripts, mappings, XSD, XSLT) are represented by:

**Resource Interface** (`src/model/Resource.ts`):
```typescript
interface Resource {
    type: string;        // "groovy", "mapping", "xsd", "xslt"
    name: string;        // "transform.groovy"
    content?: string;    // Inline content
    filePath?: string;   // External file path
}
```

**ResourceReference** (link from Component to Resource):
```typescript
interface ResourceReference {
    type: string;  // "groovy", "mapping", "xsd"
    path: string;  // "script/transform.groovy"
}
```

**Usage Pattern** (future implementation):
```typescript
const script = new Component("Script_1", "Transform", "ScriptCollection", {
    resourceReference: {
        type: "groovy",
        path: "script/transform.groovy"
    }
});
```

**Note**: Resource packaging support comes in Version 1.2.1+. The abstraction is ready, but Serializer/Packager don't yet implement script/ directory packaging.

## Current Support

| Component | Technical Name | Status | Version | Notes |
|-----------|----------------|--------|---------|-------|
| Content Modifier | `Enricher` | ✅ Implemented | 1.2 | Full support, backward compatible |
| Router | `Router` | 📋 Prepared | Future | Metadata ready, awaits implementation |
| Groovy Script | `ScriptCollection` | 📋 Prepared | Future | Requires resource packaging |
| Data Store | `DBStorage` | 📋 Prepared | Future | Metadata ready, awaits implementation |

## Backward Compatibility

All refactoring preserves:
- ✅ Generated XML structure
- ✅ HelloWorld example output
- ✅ SAP Integration Suite import compatibility
- ✅ Public API (IFlow, Component, etc.)

**Before and After** (HelloWorld):

Before v1.2:
```typescript
const cm = new Component("CallActivity_1", "Set Body", "Enricher");
cm.properties.activityType = "Enricher";
cm.properties.bodyType = "constant";
cm.properties.body = "Hello from SAP Integration Suite!";

// Later, manually add properties to IR
contentModifierNode.addProperty("activityType", "Enricher");
contentModifierNode.addProperty("bodyType", "constant");
contentModifierNode.addProperty("body", "Hello from SAP Integration Suite!");
```

After v1.2:
```typescript
const cm = new Component(
    "CallActivity_1",
    "Set Body",
    "Enricher",
    {
        body: "Hello from SAP Integration Suite!"
        // bodyType, activityType, cmdVariantUri, componentVersion
        // automatically injected from Registry metadata
    }
);

// Properties automatically applied - no manual IR manipulation needed
```

**Generated XML remains identical.**

## Benefits

1. **No Duplication** — One CallActivityWriter handles all processing components
2. **Easy Extension** — Add new components by adding Registry metadata only
3. **Maintainability** — Component knowledge centralized in Registry
4. **Consistency** — All components follow same generation pattern
5. **Type Safety** — Metadata structure ensures complete component definitions
6. **Future-Proof** — Resource abstraction ready for script/mapping packaging

## Design Principles

This architecture follows SOLID principles:

- **Single Responsibility** — CallActivityWriter only generates XML, doesn't decide what properties to include
- **Open/Closed** — Open for extension (add Registry entries), closed for modification (no code changes)
- **Dependency Inversion** — Writers depend on IR abstractions, not concrete component types
- **Composition over Duplication** — Metadata composition instead of code duplication

## Future Work (Version 1.2.1+)

1. **Implement Router** — Routing logic, route definitions, conditions
2. **Implement Groovy Script** — Script packaging, GroovyResource implementation
3. **Implement Splitter/Gather** — Collection processing components
4. **Resource Packaging** — Serializer support for script/, mapping/ directories
5. **Operation Field** — Investigate components using `operation` vs `activityType`

## Summary

The Processing Component Family refactoring:
- ✅ Eliminates hardcoded component logic
- ✅ Makes Registry the single source of truth
- ✅ Enables adding components without code changes
- ✅ Preserves backward compatibility
- ✅ Prepares architecture for resource support
- ✅ Follows SOLID principles

**Result**: Future components require only metadata, not code.
