# Factory API - Generic IFlow Creation from AI JSON

## Overview

The Factory API provides a generic layer for creating SAP CPI Integration Flows from AI-generated JSON without requiring component-specific knowledge. This enables AI services (like CAP) to generate IFlows using a simple, type-safe JSON structure.

## Installation

```bash
npm install @cpi-ai/compiler
```

## Quick Start

```typescript
import { fromJson, compileToZip, validate } from '@cpi-ai/compiler';

// Define IFlow as JSON
const json = {
    name: "Order Processing",
    sender: {
        type: "HTTPS",
        config: { address: "/api/orders" }
    },
    components: [
        {
            id: "script1",
            type: "GroovyScript",
            config: {
                name: "Transform",
                scriptName: "transform.groovy"
            }
        }
    ],
    receiver: {
        type: "HTTP",
        config: {
            url: "https://api.example.com/orders",
            method: "POST"
        }
    },
    connections: [
        { from: "script1", to: "endEvent" }
    ],
    resources: [
        {
            type: "groovy",
            name: "transform.groovy",
            content: "def Message processData(Message message) { return message; }"
        }
    ]
};

// Create IFlow from JSON
const flow = fromJson(json);

// Validate
const result = validate(flow);
console.log('Valid:', result.valid);

// Compile to ZIP
const zipBuffer = await compileToZip(flow);
fs.writeFileSync('MyFlow.zip', zipBuffer);
```

## Public APIs

### 1. createComponent(type, config)

Creates a processing component from type and configuration.

**Supported Component Types:**

| Type | Description | Required Config |
|------|-------------|-----------------|
| `ContentModifier` | Modify message headers/body | `name` |
| `Router` | Conditional routing | `name`, `routes[]` |
| `GroovyScript` | Execute Groovy script | `name`, `scriptName` |
| `DataStore` | Temporary message storage | `name`, `operation`, `storageName`, `entryId` |
| `Multicast` | Parallel processing | `name` |
| `Splitter` | Split messages | `name`, `expression`, `expressionType?` |
| `Gather` | Aggregate messages | `name`, `aggregationAlgorithm?` |
| `MessageMapping` | SAP Message Mapping | `name`, `mappingName` |
| `XmlValidator` | Validate XML against XSD | `name`, `xsd` |
| `XsltMapping` | XSLT transformation | `name`, `mappingName` |
| `ProcessCall` | Call subprocess | `name`, `processId` |

**Examples:**

```typescript
// Content Modifier
const cm = createComponent('ContentModifier', {
    name: 'Set Headers',
    headers: { Country: 'IN' }
});

// Router
const router = createComponent('Router', {
    name: 'Route by Type',
    routes: [
        { condition: "${header.type} == 'A'", target: 'componentA' },
        { condition: "${header.type} == 'B'", target: 'componentB' }
    ],
    defaultRoute: { target: 'defaultComponent' }
});

// Groovy Script
const script = createComponent('GroovyScript', {
    name: 'Transform',
    scriptName: 'transform.groovy'
});

// Data Store (Write)
const store = createComponent('DataStore', {
    name: 'Store Order',
    operation: 'put',
    storageName: 'OrderStore',
    entryId: '${header.orderId}',
    visibility: 'global',
    expire: 90
});

// Splitter
const splitter = createComponent('Splitter', {
    name: 'Split Orders',
    expression: '/Orders/Order',
    expressionType: 'XPath',
    parallelProcessing: 'true',
    streaming: 'true'
});

// Gather
const gather = createComponent('Gather', {
    name: 'Aggregate Results',
    aggregationAlgorithm: 'sap-identical-multi-mapping',
    messageType: 'SameXMLFormat'
});

// XML Validator
const validator = createComponent('XmlValidator', {
    name: 'Validate Order',
    xsd: '/xsd/OrderSchema.xsd',
    preventException: false
});

// XSLT Mapping
const xslt = createComponent('XsltMapping', {
    name: 'Transform to Invoice',
    mappingName: 'OrderToInvoice.xsl',
    outputFormat: 'Bytes'
});
```

### 2. createAdapter(type, direction, config)

Creates a sender or receiver adapter from type, direction, and configuration.

**Supported Adapter Types:**

| Type | Direction | Description | Required Config |
|------|-----------|-------------|-----------------|
| `HTTP` | Sender | Expose HTTP endpoint | `address` |
| `HTTP` | Receiver | Call HTTP endpoint | `url?`, `method?` |
| `HTTPS` | Sender | Expose HTTPS endpoint | `address` |
| `HTTPS` | Receiver | Call HTTPS endpoint | `url?`, `method?` |
| `OData` | Sender | Poll OData service | `resourcePath` |
| `OData` | Receiver | Query/CRUD OData | `resourcePath`, `operation` |
| `SFTP` | Sender | Poll SFTP directory | `host`, `directory`, `credentialName` |
| `SFTP` | Receiver | Upload to SFTP | `host`, `directory`, `fileName`, `credentialName` |
| `SOAP` | Sender | Expose SOAP endpoint | `address?` |
| `SOAP` | Receiver | Call SOAP service | `url?`, `soapAction?` |
| `IDoc` | Sender | Receive SAP IDoc | `address`, `credentialName` |
| `IDoc` | Receiver | Send SAP IDoc | `address`, `credentialName` |

**Examples:**

```typescript
// HTTPS Sender
const sender = createAdapter('HTTPS', 'Sender', {
    address: '/api/orders',
    authentication: 'RoleBased',
    userRole: 'ESBMessaging.send'
});

// HTTP Receiver
const receiver = createAdapter('HTTP', 'Receiver', {
    url: 'https://api.example.com/orders',
    method: 'POST',
    authentication: 'Basic',
    credentialName: 'API_CREDS'
});

// OData Query
const odata = createAdapter('OData', 'Receiver', {
    resourcePath: 'Orders',
    operation: 'Query',
    filter: "Status eq 'Open'",
    select: 'OrderID,Customer,Amount'
});

// SFTP Sender
const sftp = createAdapter('SFTP', 'Sender', {
    host: 'sftp.example.com',
    directory: '/incoming',
    filePattern: '*.xml',
    credentialName: 'SFTP_CREDS',
    pollingInterval: '60000'
});

// SOAP Receiver
const soap = createAdapter('SOAP', 'Receiver', {
    name: 'Call S4HANA',
    url: 'https://s4hana.company.com/service',
    soapAction: 'create',
    soapVersion: 'SOAP 1.1',
    authentication: 'Basic',
    credentialName: 'S4_CREDS'
});

// IDoc Receiver
const idoc = createAdapter('IDoc', 'Receiver', {
    name: 'Send IDoc',
    address: 'http://s4hana:44300/sap/bc/srt/idoc?sap-client=100',
    credentialName: 'S4_CREDS',
    locationId: 'S4_CloudConnector'
});
```

### 3. fromJson(json)

Creates a complete IFlow from AI-generated JSON structure.

**JSON Structure:**

```typescript
interface IFlowJson {
    name: string;
    sender?: {
        type: AdapterType;
        config: AdapterConfig;
    };
    receiver?: {
        type: AdapterType;
        config: AdapterConfig;
    };
    components?: Array<{
        id?: string;
        type: ComponentType;
        config: ComponentConfig;
    }>;
    connections?: Array<{
        from: string;
        to: string;
    }>;
    resources?: Array<{
        type: 'groovy' | 'mapping' | 'xsd' | 'xslt';
        name: string;
        content: string;
    }>;
    subProcesses?: Array<{
        name: string;
        components?: Array<{ id?: string; type: ComponentType; config: ComponentConfig }>;
        connections?: ConnectionConfig[];
    }>;
    exceptionSubprocesses?: Array<{
        name: string;
        components?: Array<{ id?: string; type: ComponentType; config: ComponentConfig }>;
        connections?: ConnectionConfig[];
    }>;
}
```

**Complete Example:**

```typescript
const json = {
    name: "Order Processing Flow",
    sender: {
        type: "HTTPS",
        config: {
            address: "/api/orders",
            authentication: "RoleBased"
        }
    },
    components: [
        {
            id: "validate",
            type: "XmlValidator",
            config: {
                name: "Validate Order XML",
                xsd: "/xsd/Order.xsd"
            }
        },
        {
            id: "transform",
            type: "GroovyScript",
            config: {
                name: "Transform Order",
                scriptName: "transformOrder.groovy"
            }
        },
        {
            id: "router",
            type: "Router",
            config: {
                name: "Route by Priority",
                routes: [
                    { condition: "${header.priority} == 'high'", target: "urgent" },
                    { condition: "${header.priority} == 'low'", target: "normal" }
                ]
            }
        },
        {
            id: "urgent",
            type: "ContentModifier",
            config: {
                name: "Mark Urgent",
                headers: { Urgent: "true" }
            }
        },
        {
            id: "normal",
            type: "ContentModifier",
            config: {
                name: "Mark Normal",
                headers: { Urgent: "false" }
            }
        }
    ],
    receiver: {
        type: "HTTP",
        config: {
            url: "https://backend.example.com/process",
            method: "POST",
            authentication: "Basic",
            credentialName: "BACKEND_CREDS"
        }
    },
    connections: [
        { from: "validate", to: "transform" },
        { from: "transform", to: "router" },
        { from: "router", to: "urgent" },
        { from: "router", to: "normal" }
    ],
    resources: [
        {
            type: "xsd",
            name: "Order.xsd",
            content: "<?xml version=\"1.0\"?><xs:schema>...</xs:schema>"
        },
        {
            type: "groovy",
            name: "transformOrder.groovy",
            content: "def Message processData(Message message) { return message; }"
        }
    ]
};

// Create, validate, and compile
const flow = fromJson(json);
const validationResult = validate(flow);
if (validationResult.valid) {
    const zipBuffer = await compileToZip(flow);
    fs.writeFileSync('OrderFlow.zip', zipBuffer);
}
```

## Type Mappings

### Component Type → SDK Class Mapping

| AI Type | SDK Class | Registry Key |
|---------|-----------|--------------|
| `ContentModifier` | `Component` | `Enricher` |
| `Router` | `Router` | `Router` |
| `GroovyScript` | `GroovyScript` | `ScriptCollection` |
| `DataStore` | `DataStore` | `DBStorage` |
| `Multicast` | `Multicast` | `Multicast` |
| `Splitter` | `Splitter` | `GeneralSplitter` |
| `Gather` | `Gather` | `Gather` |
| `MessageMapping` | `MessageMapping` | `MessageMapping` |
| `XmlValidator` | `XmlValidator` | `XmlValidator` |
| `XsltMapping` | `XsltMapping` | `XSLTMapping` |
| `ProcessCall` | `ProcessCall` | `ProcessCall` |

### Adapter Type → SDK Class Mapping

| AI Type | Direction | SDK Class | Factory Method |
|---------|-----------|-----------|----------------|
| `HTTP` | Sender | `HttpAdapter` | `HttpAdapter.sender()` |
| `HTTP` | Receiver | `HttpAdapter` | `HttpAdapter.receiver()` |
| `HTTPS` | Sender | `HttpAdapter` | `HttpAdapter.sender()` |
| `HTTPS` | Receiver | `HttpAdapter` | `HttpAdapter.receiver()` |
| `OData` | Sender | `ODataAdapter` | `ODataAdapter.sender()` |
| `OData` | Receiver | `ODataAdapter` | `ODataAdapter.receiver()` |
| `SFTP` | Sender | `SftpAdapter` | `SftpAdapter.sender()` |
| `SFTP` | Receiver | `SftpAdapter` | `SftpAdapter.receiver()` |
| `SOAP` | Sender | `SoapAdapter` | `new SoapAdapter()` |
| `SOAP` | Receiver | `SoapAdapter` | `SoapAdapter.receiver()` |
| `IDoc` | Sender | `IdocAdapter` | `IdocAdapter.sender()` |
| `IDoc` | Receiver | `IdocAdapter` | `IdocAdapter.receiver()` |

## Error Handling

The factory functions validate inputs and throw descriptive errors:

```typescript
// Missing required property
try {
    createComponent('GroovyScript', {
        name: 'Transform'
        // Missing scriptName
    });
} catch (error) {
    console.error(error.message);
    // Error: GroovyScript requires scriptName property
}

// Unsupported type
try {
    createComponent('InvalidType', { name: 'Test' });
} catch (error) {
    console.error(error.message);
    // Error: Unsupported component type: InvalidType
}

// Connection to non-existent component
try {
    fromJson({
        name: 'Flow',
        connections: [
            { from: 'nonexistent', to: 'another' }
        ]
    });
} catch (error) {
    console.error(error.message);
    // Error: Connection source component not found: nonexistent
}
```

## Best Practices

1. **Always validate before compiling:**
   ```typescript
   const flow = fromJson(json);
   const result = validate(flow);
   if (!result.valid) {
       console.error('Validation errors:', result.errors);
       return;
   }
   const zip = await compileToZip(flow);
   ```

2. **Use component IDs for connections:**
   ```typescript
   components: [
       { id: 'script1', type: 'GroovyScript', config: { ... } },
       { id: 'router1', type: 'Router', config: { ... } }
   ],
   connections: [
       { from: 'script1', to: 'router1' }
   ]
   ```

3. **Include resources for referenced files:**
   ```typescript
   // If using GroovyScript
   components: [
       { id: 'script1', type: 'GroovyScript', config: { scriptName: 'transform.groovy' } }
   ],
   resources: [
       { type: 'groovy', name: 'transform.groovy', content: '...' }
   ]
   ```

4. **Preserve existing SDK behavior:**
   - The factory layer is additive - existing SDK APIs continue to work
   - You can mix factory and SDK approaches in the same flow

## Integration with CAP

CAP services can use the factory API to generate IFlows from natural language:

```typescript
// CAP Service: AI generates JSON
const aiJson = await aiService.generateIFlow(userPrompt);

// Factory creates IFlow
const flow = fromJson(aiJson);

// Validate and compile
const validationResult = validate(flow);
if (validationResult.valid) {
    const zipBuffer = await compileToZip(flow);
    return zipBuffer;
} else {
    throw new Error(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
}
```

## TypeScript Support

Full TypeScript declarations included:

```typescript
import {
    createComponent,
    createAdapter,
    fromJson,
    ComponentType,
    AdapterType,
    AdapterDirection,
    IFlowJson
} from '@cpi-ai/compiler';

// Type-safe component creation
const cm = createComponent('ContentModifier', {
    name: 'Set Headers',
    headers: { Country: 'IN' }
});

// Type-safe adapter creation
const sender = createAdapter('HTTPS', 'Sender', {
    address: '/api/orders'
});

// Type-safe JSON structure
const json: IFlowJson = {
    name: 'MyFlow',
    sender: {
        type: 'HTTPS',
        config: { address: '/api/orders' }
    },
    components: [],
    receiver: {
        type: 'HTTP',
        config: { url: 'https://api.example.com' }
    }
};

const flow = fromJson(json);
```

## Summary

The Factory API enables:

✅ Generic IFlow creation from AI JSON
✅ No component-specific knowledge required in CAP
✅ Type-safe TypeScript support
✅ Reuses existing SDK classes
✅ Validates inputs with clear error messages
✅ Supports all currently supported component types
✅ Preserves existing SDK APIs and behavior
✅ Complete end-to-end: JSON → IFlow → validate() → compileToZip()
