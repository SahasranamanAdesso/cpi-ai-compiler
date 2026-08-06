# @cpi-ai/compiler

> AI-powered TypeScript compiler for SAP Cloud Integration (CPI) Integration Flows

[![npm version](https://img.shields.io/npm/v/@cpi-ai/compiler.svg)](https://www.npmjs.com/package/@cpi-ai/compiler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

Build SAP Cloud Integration flows programmatically using TypeScript instead of manual graphical configuration.

---

## ?? Quick Start

### Installation

```bash
npm install @cpi-ai/compiler
```

### Basic Example

```typescript
import { compileToZip, IFlow, Component, HttpAdapter } from '@cpi-ai/compiler';
import * as fs from 'fs';

// Create an integration flow
const flow = new IFlow("HelloWorld");

// Add HTTPS sender
flow.setSender(HttpAdapter.sender({ address: "/hello" }));

// Add content modifier
const modifier = new Component(
    "SetBody",
    "Set Response",
    "Enricher",
    { body: "Hello from SAP Integration Suite!" }
);
flow.addComponent(modifier);

// Add HTTP receiver  
flow.setReceiver(HttpAdapter.receiver({ url: "https://example.com" }));

// Compile to ZIP
const zipBuffer = await compileToZip(flow);
fs.writeFileSync("HelloWorld.zip", zipBuffer);

// Import HelloWorld.zip into SAP Integration Suite!
```

---

## ? Features

- ? **Type-Safe API** - Full TypeScript support with IntelliSense
- ? **AI-Ready** - Generate flows using LLMs (Claude, GPT, etc.)
- ? **Version Control** - Integration flows as code in Git
- ? **SAP Compatible** - Generated ZIPs import directly into SAP Integration Suite
- ? **Complete BPMN** - Full BPMN 2.0 + SAP extensions
- ? **Visual Layout** - Automatic diagram coordinates generation
- ? **Resource Support** - Embed Groovy scripts, XSLT, XSD schemas
- ? **Validation** - Built-in flow validation before compilation

---

## ?? Supported Components

### Adapters
- **HTTPS** - HTTP/HTTPS sender and receiver
- **OData** - OData V2/V4 operations
- **SFTP** - SFTP file operations
- **SOAP** - SOAP 1.1/1.2 web services
- **IDoc** - SAP IDoc integration

### Processing
- **Content Modifier**, **Router**, **XML Validator**, **XSLT Mapping**
- **Groovy Script**, **Data Store**, **Splitter**, **Gather**, **Multicast**
- **Local Integration Process**, **Process Call**, **Exception Subprocess**

---

## ?? API Reference

### Core Functions

```typescript
// Compile to ZIP
const zipBuffer = await compileToZip(flow);

// Validate before compilation
const result = validate(flow);

// Query supported components
const components = supportedComponents();
```

### Building Flows

```typescript
import { IFlow, Component, HttpAdapter, ODataAdapter } from '@cpi-ai/compiler';

const flow = new IFlow("MyFlow");

// Set adapters
flow.setSender(HttpAdapter.sender({ address: "/api" }));
flow.setReceiver(ODataAdapter.receiver({...}));

// Add components
const modifier = new Component("ID", "Name", "Enricher", {...});
flow.addComponent(modifier);

// Connect components
flow.connect(componentA, componentB);
```

---

## ?? Documentation

- [GitHub Repository](https://github.com/SahasranamanAdesso/cpi-ai_compiler)
- [Examples](https://github.com/SahasranamanAdesso/cpi-ai_compiler/tree/main/examples)
- [API Docs](https://github.com/SahasranamanAdesso/cpi-ai_compiler/tree/main/docs)

---

## ?? License

MIT License - see [LICENSE](./LICENSE)

---

**Made with ?? for the SAP Integration community**