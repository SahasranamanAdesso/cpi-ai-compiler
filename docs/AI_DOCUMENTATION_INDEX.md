# AI Documentation Index

**Version**: 1.0  
**Created**: 2026-08-06  
**Purpose**: Navigation index for AI translation documentation

---

## Documentation Set Overview

This documentation set enables any LLM to translate natural language requests into valid SAP Integration Flow compiler JSON.

---

## Core Documentation (Always Include)

### 1. [AI_COMPONENT_METADATA.json](./AI_COMPONENT_METADATA.json)
**Primary schema** - Machine-readable SDK API with constraints, examples, and validation rules.

**Use For**: Component constructors, method signatures, property schemas, validation rules

**Include In**: Every AI context for compilation tasks

---

### 2. [ai-prompting-guide.md](./ai-prompting-guide.md)
**LLM instruction manual** - Step-by-step guide for translating natural language to compiler JSON.

**Use For**: Understanding translation process, avoiding hallucinations, error recovery

**Include In**: AI system prompts for translation tasks

---

### 3. [compiler-language.md](./compiler-language.md)
**Language specification** - Defines compiler language, flow structure, mandatory rules, and forbidden patterns.

**Use For**: Understanding what constitutes valid compiler input

**Include In**: Initial context setup for new AI sessions

---

## Reference Documentation (Include As Needed)

### 4. [adapter-configuration.md](./adapter-configuration.md)
**Adapter reference** - Complete configuration guide for HTTP, OData, SFTP, SOAP, IDoc adapters.

**Use For**: When user mentions specific adapters or endpoints

**Include When**: User request involves "receive", "send", "poll", "endpoint", "adapter"

---

### 5. [resource-rules.md](./resource-rules.md)
**Resource dependency rules** - Pairing requirements for GroovyResource, XsdResource, XsltResource, MappingResource.

**Use For**: When components need external files (Groovy scripts, XSD schemas, XSLT stylesheets)

**Include When**: User request involves "validate", "transform", "script", "schema", "XSLT"

---

### 6. [expression-language.md](./expression-language.md)
**Expression syntax reference** - Simple Expression, XPath, Camel Simple, Groovy syntax.

**Use For**: Router conditions, Content Modifier expressions, dynamic values

**Include When**: User request involves "route", "condition", "if", "based on", "dynamic"

---

### 7. [compiler-validation-rules.md](./compiler-validation-rules.md)
**Validation rules catalog** - Complete list of compiler validation rules with examples.

**Use For**: Pre-flight validation before returning code to user

**Include When**: Validating generated code or debugging compilation errors

---

## Existing Documentation (Reference)

### From Repository Root

- **[CLAUDE.md](../CLAUDE.md)** - Engineering guidelines and knowledge base index
- **[SUPPORTED_COMPONENTS.md](../SUPPORTED_COMPONENTS.md)** - Natural language component descriptions
- **[examples/](../examples/)** - 20 working SDK usage examples

### From Source Code

- **[src/registry/ComponentRegistry.ts](../src/registry/ComponentRegistry.ts)** - Authoritative component catalog with SAP metadata

---

## Documentation Usage Matrix

| User Request Type | Required Docs | Optional Docs |
|------------------|---------------|---------------|
| **Simple flow** (HTTP → modify → HTTP) | AI_COMPONENT_METADATA.json, ai-prompting-guide.md | compiler-language.md |
| **Conditional routing** | AI_COMPONENT_METADATA.json, ai-prompting-guide.md, expression-language.md | compiler-validation-rules.md |
| **Validation + Transform** | AI_COMPONENT_METADATA.json, resource-rules.md | expression-language.md |
| **Adapter configuration** | AI_COMPONENT_METADATA.json, adapter-configuration.md | - |
| **Groovy script** | AI_COMPONENT_METADATA.json, resource-rules.md | expression-language.md |
| **Debugging compilation error** | compiler-validation-rules.md | All reference docs |

---

## AI Context Budget Recommendations

### Minimal Context (Fast Response)
```
- AI_COMPONENT_METADATA.json (complete)
- ai-prompting-guide.md (sections 1-6)
- ComponentRegistry.ts (component list only)
```
**Token estimate**: ~15K tokens

### Standard Context (Most Requests)
```
- AI_COMPONENT_METADATA.json
- ai-prompting-guide.md
- compiler-language.md
- adapter-configuration.md (relevant adapter only)
- expression-language.md (relevant section only)
```
**Token estimate**: ~25K tokens

### Complete Context (Complex Flows)
```
- All 7 AI documentation files
- ComponentRegistry.ts (complete)
- 2-3 relevant examples/*.ts
```
**Token estimate**: ~40K tokens

---

## Quick Reference Cheatsheet

### Component Selection
1. Check ComponentRegistry.ts for available components
2. Match user intent to component displayName
3. Use component's technical name (Registry key) in code

### Adapter Selection
| User Says | Use |
|-----------|-----|
| "receive HTTP", "webhook" | HttpAdapter.sender() |
| "send HTTP", "call API" | HttpAdapter.receiver() |
| "poll files", "SFTP" | SftpAdapter.sender() |
| "write file" | SftpAdapter.receiver() |
| "call SAP", "OData" | ODataAdapter.receiver() |
| "receive SOAP" | SoapAdapter.sender() |
| "call SOAP" | SoapAdapter.receiver() |

### Expression Syntax
```javascript
// Router conditions
"${header.Country} = 'IN'"          // ✅ Single = and single quotes
"${header.Country} == 'IN'"         // ❌ Double equals
"${header.Country} = \"IN\""        // ❌ Double quotes

// XPath (Splitter, Content Modifier)
"/Order/OrderID"                     // ✅ Element
"/Order/@Type"                       // ✅ Attribute

// Groovy (GroovyScript component)
message.getHeader("Country", String.class)  // ✅ SAP API
```

### Resource Pairing
```typescript
// Groovy
GroovyScript("name", "script.groovy") ↔ GroovyResource("script.groovy", content)

// XSD
XmlValidator({xsd: "/xsd/Schema.xsd"}) ↔ XsdResource("Schema.xsd", xsdContent)

// XSLT
XSLTMapping({mappingname: "Transform"}) ↔ XsltResource("Transform.xsl", xsltContent)
```

---

## Validation Checklist (Always Run)

Before returning code to user:

- [ ] Exactly 1 IFlow
- [ ] Exactly 1 Sender
- [ ] At least 1 Receiver
- [ ] All component types exist in ComponentRegistry
- [ ] All components added before connecting
- [ ] Router has ≥2 routes with matching connections
- [ ] Resource-dependent components have paired resources
- [ ] Resource names match component references
- [ ] Expressions use single `=` and single quotes `'`
- [ ] No direct BPMN/XML generation
- [ ] No hardcoded metadata (activityType, cmdVariantUri)
- [ ] Adapter names valid XML NCName (no spaces)
- [ ] Content Modifier cells use named IDs (Action, Type, Value, Name)

---

## Future Enhancements

### Planned Documentation
- Error message decoder (common SAP validation errors → fixes)
- Component selection decision tree
- Advanced patterns library (split-gather, error handling, subprocess)

### Version Control
- Current: v1.0 (2026-08-06)
- All 6 AI-facing docs created
- Integrated with existing AI_COMPONENT_METADATA.json
- Ready for Fiori + CAP integration

---

**Status**: AI translation documentation complete. Ready for integration with AI-powered Fiori + CAP application.
