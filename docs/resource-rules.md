# Resource Dependency Rules

**Version**: 1.0  
**Purpose**: Document resource-component pairing requirements

---

## Overview

Some SAP components require **external resource files** packaged with the iFlow. Every resource must:

1. Be paired with a component that references it
2. Have matching name between component reference and resource
3. Be added to flow via `flow.addResource(resource)`

---

## Resource Types

### 1. GroovyResource → Groovy Script

**Component**: `new GroovyScript(name, scriptFileName)`  
**Resource**: `new GroovyResource(fileName, content)`

**Pairing Rule**:
```typescript
GroovyScript.scriptName === GroovyResource.name
```

**Example**:
```typescript
// Component
const script = new GroovyScript("Transform Message", "transform.groovy");

// Resource
const resource = new GroovyResource(
    "transform.groovy",  // MUST match scriptName above
    `import com.sap.gateway.ip.core.customdev.util.Message
    
    def Message processData(Message message) {
        def body = message.getBody(String.class)
        message.setBody(body.toUpperCase())
        return message
    }`
);

flow.addComponent(script);
flow.addResource(resource);  // REQUIRED
```

**Validation**:
- ✅ File name matches: `transform.groovy`
- ❌ Mismatch: `new GroovyScript("...", "transform.groovy")` + `new GroovyResource("process.groovy", ...)`

---

### 2. XsdResource → XML Validator

**Component**: `new Component(id, name, "XmlValidator", {xsd: path})`  
**Resource**: `new XsdResource(fileName, xsdContent)`

**Pairing Rule**:
```typescript
XmlValidator.properties.xsd === "/xsd/" + XsdResource.name
```

**Example**:
```typescript
// Component
const validator = new Component("Validator1", "Validate Order", "XmlValidator", {
    xmlSchemaSource: "iflowOption",
    xsd: "/xsd/Order.xsd",  // References resource
    preventException: "false"
});

// Resource
const schema = new XsdResource(
    "Order.xsd",  // Name extracted from path above
    `<?xml version="1.0" encoding="UTF-8"?>
    <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
        <xs:element name="Order">
            <xs:complexType>
                <xs:sequence>
                    <xs:element name="OrderID" type="xs:string"/>
                </xs:sequence>
            </xs:complexType>
        </xs:element>
    </xs:schema>`
);

flow.addComponent(validator);
flow.addResource(schema);  // REQUIRED
```

**Validation**:
- ✅ Path format: `/xsd/{fileName}`
- ✅ Resource name: `{fileName}` matches
- ❌ Wrong path: `xsd/Order.xsd` (missing leading `/`)
- ❌ Wrong name: `/xsd/Order.xsd` + `new XsdResource("OrderSchema.xsd", ...)`

**Alternative**: Schema from header
```typescript
// No resource needed if xmlSchemaSource = "header"
{
    xmlSchemaSource: "header",
    headerSource: "SchemaPath",
    xsd: ""  // Empty when using header
}
```

---

### 3. XsltResource → XSLT Mapping

**Component**: `new Component(id, name, "XSLTMapping", {mappingname, mappinguri})`  
**Resource**: `new XsltResource(fileName, xsltContent)`

**Pairing Rule**:
```typescript
XSLTMapping.properties.mappingname === XsltResource.name (without .xsl)
XSLTMapping.properties.mappinguri === "dir://mapping/xslt/src/main/resources/mapping/" + XsltResource.name
```

**Example**:
```typescript
// Component
const mapping = new Component("Mapping1", "Transform to OData", "XSLTMapping", {
    mappingname: "OrderToOData",  // Name without extension
    mappinguri: "dir://mapping/xslt/src/main/resources/mapping/OrderToOData.xsl",
    mappingpath: "src/main/resources/mapping/",
    mappingSource: "mappingSrcIflow",
    mappingoutputformat: "Bytes"
});

// Resource
const stylesheet = new XsltResource(
    "OrderToOData.xsl",  // MUST match mappingname + .xsl
    `<?xml version="1.0" encoding="UTF-8"?>
    <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:output method="xml" indent="yes"/>
        <xsl:template match="/Order">
            <entry>...</entry>
        </xsl:template>
    </xsl:stylesheet>`
);

flow.addComponent(mapping);
flow.addResource(stylesheet);  // REQUIRED
```

**Validation**:
- ✅ `mappingname: "OrderToOData"` + `new XsltResource("OrderToOData.xsl", ...)`
- ✅ `mappinguri` contains full path with filename
- ❌ Mismatch: `mappingname: "Transform"` + `new XsltResource("OrderToOData.xsl", ...)`

**Alternative**: XSLT from header
```typescript
{
    mappingSource: "mappingSrcHeader",
    mappingHeaderNameKey: "XsltPath",
    mappingname: "",  // Empty when using header
    mappinguri: ""
}
```

---

### 4. MappingResource → Message Mapping

**Component**: `new Component(id, name, "MessageMapping", {mappingname, mappinguri})`  
**Resource**: `new MappingResource(fileName, content)`

**Pairing Rule**:
```typescript
MessageMapping.properties.mappingname === MappingResource.name (without .mmap)
MessageMapping.properties.mappinguri === "dir://mapping/" + MappingResource.name
```

**Example**:
```typescript
// Component
const mapping = new Component("MsgMap1", "Map IDoc to JSON", "MessageMapping", {
    mappingType: "MessageMapping",
    mappingReference: "static",
    mappingname: "IdocToJson",
    mappingpath: "src/main/resources/mapping/",
    mappinguri: "dir://mapping/IdocToJson.mmap"
});

// Resource
const mappingFile = new MappingResource(
    "IdocToJson.mmap",
    // Binary .mmap content or reference to file
);

flow.addComponent(mapping);
flow.addResource(mappingFile);  // REQUIRED
```

**Note**: .mmap files are binary and typically referenced from filesystem, not inline content.

---

## Resource Locations in Package

When packaged, resources are placed in:

| Resource Type | Directory | Example |
|---------------|-----------|---------|
| GroovyResource | `src/main/resources/script/` | `script/transform.groovy` |
| XsdResource | `src/main/resources/xsd/` | `xsd/Order.xsd` |
| XsltResource | `src/main/resources/mapping/` | `mapping/OrderToOData.xsl` |
| MappingResource | `src/main/resources/mapping/` | `mapping/IdocToJson.mmap` |

---

## Validation Checklist

For each component type:

### Groovy Script
- [ ] `GroovyScript.scriptName` ends with `.groovy`
- [ ] Matching `GroovyResource` exists with same name
- [ ] Resource content includes `def Message processData(Message message)`
- [ ] Resource added via `flow.addResource()`

### XML Validator
- [ ] `xsd` property starts with `/xsd/`
- [ ] `xmlSchemaSource` is `"iflowOption"` (if using resource)
- [ ] Matching `XsdResource` name matches path after `/xsd/`
- [ ] XSD content is valid XML schema
- [ ] Resource added via `flow.addResource()`

### XSLT Mapping
- [ ] `mappingname` matches resource name (without `.xsl`)
- [ ] `mappinguri` follows pattern `dir://mapping/xslt/src/main/resources/mapping/{name}.xsl`
- [ ] Matching `XsltResource` exists
- [ ] XSLT content is valid stylesheet
- [ ] Resource added via `flow.addResource()`

### Message Mapping
- [ ] `mappingname` matches resource name (without `.mmap`)
- [ ] `mappinguri` follows pattern `dir://mapping/{name}.mmap`
- [ ] Matching `MappingResource` exists
- [ ] Resource added via `flow.addResource()`

---

## Common Errors

### Error: Resource Not Found
```
Cause: Component references resource but resource not added to flow
Fix: flow.addResource(resource)
```

### Error: Name Mismatch
```
Cause: GroovyScript("transform.groovy") + GroovyResource("process.groovy")
Fix: Ensure names match exactly
```

### Error: Wrong Path Format
```
Cause: xsd: "Order.xsd" (missing /xsd/ prefix)
Fix: xsd: "/xsd/Order.xsd"
```

### Error: Orphaned Resource
```
Cause: Resource added but no component references it
Fix: Either remove resource or add component that uses it
```

---

## Resource-Free Components

These components do NOT require resources:

- Content Modifier (Enricher)
- Router
- Data Store
- Splitter
- Gather
- Multicast
- Process Call

Only transformation/validation components need paired resources.
