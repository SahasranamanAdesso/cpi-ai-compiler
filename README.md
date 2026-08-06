# SAP Integration SDK

**TypeScript SDK for SAP Cloud Integration (CPI) Integration Flow Development**

Generate SAP Cloud Integration Integration Flows programmatically using TypeScript instead of manual graphical configuration.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/SahasranamanAdesso/cpi-ai_compiler)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Why This Project Exists

SAP Cloud Integration Suite provides a powerful graphical editor for building Integration Flows. However, manual graphical configuration has limitations:

❌ **Not version-controlled** - No clear code history  
❌ **Not testable** - Difficult to automate testing  
❌ **Not scalable** - Creating hundreds of similar flows is tedious  
❌ **Not AI-friendly** - LLMs cannot generate graphical configurations  

This SDK solves these problems by allowing you to:

✅ **Write Integration Flows as code** - TypeScript SDK with IDE autocomplete  
✅ **Version control** - Track every change in Git  
✅ **Automate** - Generate Integration Flows programmatically  
✅ **Test** - Unit test your integration logic  
✅ **AI-ready** - LLMs can generate TypeScript code  

---

## Features

### ✅ Version 1.0 (Current - Editor Compatible)

- ✅ **TypeScript SDK** - Type-safe API for building Integration Flows
- ✅ **BPMN Compiler** - Transforms TypeScript models to SAP-compatible BPMN XML
- ✅ **Editor Compatible** - Generated flows open successfully in SAP Integration Suite graphical editor
- ✅ **Diagram Interchange** - Complete visual layout generation
- ✅ **Supported Components**:
  - HTTPS Sender
  - HTTP Receiver  
  - Content Modifier (Enricher)
- ✅ **Packaging** - Generates .zip artifacts ready for import
- ✅ **Metadata-Driven** - Component Registry for extensibility

### 🚀 Roadmap

- **Version 1.1** - AI Integration (LLM generates TypeScript SDK code)
- **Version 1.2** - Core Enterprise Components (Router, Groovy, XML/JSON transformers)
- **Version 2.0** - Deployment API (automated deployment to SAP Integration Suite)
- **Version 3.0** - AI-Native Integration Development (natural language to Integration Flow)

See [ROADMAP.md](ROADMAP.md) for details.

---

## Architecture

The compiler follows a clean, SOLID architecture:

```
Model → Registry → Mapper → IR → Writers → Serializer → Packager → HelloWorld.zip
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed explanation.

### Processing Component Family

The compiler uses a metadata-driven approach for CallActivity-based components (Content Modifier, Router, Groovy Script, etc.). This eliminates code duplication and makes adding new components trivial—just add Registry metadata, no code changes required.

See [Processing Components](docs/architecture/processing-components.md) for details.

---

## Installation

```bash
# Clone repository
git clone https://github.com/SahasranamanAdesso/cpi-ai_compiler.git
cd sap-integration-sdk

# Install dependencies
npm install

# Build
npm run build
```

---

## Quick Start

### Generate HelloWorld Integration Flow

```bash
npm run helloworld
```

This generates `HelloWorld.zip` ready to import into SAP Integration Suite.

### Import to SAP Integration Suite

1. Open SAP Integration Suite
2. Navigate to **Design** → **Integrations**
3. Click **Import**
4. Upload `HelloWorld.zip`
5. Open in graphical editor ✅

### Write Your Own Integration Flow

```typescript
import { IFlow, Component } from 'sap-integration-sdk';
import { BpmnProcessMapper } from 'sap-integration-sdk';
import { IflowSerializer, IflowPackager } from 'sap-integration-sdk';

// 1. Build the model
const flow = new IFlow("SalesOrderSync");

const contentModifier = new Component(
    "CallActivity_1",
    "Set Headers",
    "Enricher"
);
contentModifier.properties.bodyType = "constant";
contentModifier.properties.body = "Hello from SAP!";

flow.addComponent(contentModifier);

// 2. Compile to BPMN IR
const mapper = new BpmnProcessMapper();
const definitions = mapper.map(flow);

// 3. Serialize & Package
const serializer = new IflowSerializer();
serializer.serialize(definitions, './output', "SalesOrderSync");

const packager = new IflowPackager();
await packager.package('./output', "SalesOrderSync", 'SalesOrderSync.zip');
```

---

## Supported Components

| Component | Type | Status | Version |
|-----------|------|--------|---------|
| HTTPS Sender | Adapter | ✅ Stable | 1.0 |
| HTTP Receiver | Adapter | ✅ Stable | 1.0 |
| Content Modifier | Enricher | ✅ Stable | 1.0 |

See [SUPPORTED_COMPONENTS.md](SUPPORTED_COMPONENTS.md) for detailed documentation.

---

## Development

### Build
```bash
npm run build
```

### Run Tests
```bash
ts-node test/component-mapper.test.ts
ts-node test/bpmn-process-mapper.test.ts
ts-node test/registry.test.ts
```

---

## Known Limitations (Version 1.0)

- Limited component library (only 3 components)
- No deployment API (manual import required)
- No validation engine
- Hardcoded adapter properties

See [ROADMAP.md](ROADMAP.md) for planned improvements.

---

## License

MIT License - see LICENSE for details.

---

**Generated Integration Flows are compatible with SAP Integration Suite version 1.x and above.**
