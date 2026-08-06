# Validation Error Analysis - MinimalDemo

**Date**: 2026-08-06  
**Goal**: Identify missing mandatory properties causing red validation markers

---

## Comparison Methodology

Compare generated properties against SAP-exported working examples.
Evidence sources from ComponentRegistry documentation.

---

## 1. HTTPS Sender

### Reference (IPRO_PRODUCT_HTTP.iflw)
```xml
<ifl:property><key>Description</key><value/></ifl:property>
<ifl:property><key>Name</key><value>HTTPS</value></ifl:property>
<ifl:property><key>TransportProtocolVersion</key><value>1.5.2</value></ifl:property>
<ifl:property><key>ComponentSWCVName</key><value>external</value></ifl:property>
<ifl:property><key>ComponentSWCVId</key><value>1.5.2</value></ifl:property>
<ifl:property><key>clientCertificates</key><value/></ifl:property>
<ifl:property><key>urlPath</key><value>/ipro_product/*</value></ifl:property>
```

### Generated (MinimalDemo)
```xml
<ifl:property><key>address</key><value>/api/orders</value></ifl:property>
<!-- Missing: Description, Name, TransportProtocolVersion, ComponentSWCVName, ComponentSWCVId, clientCertificates -->
<!-- Wrong property name: address should be urlPath -->
```

### Missing Properties for HTTPS Sender
1. `Description` = "" (empty but required)
2. `Name` = "HTTPS Sender" (must match messageFlow name)
3. `TransportProtocolVersion` = "1.5.2"
4. `ComponentSWCVName` = "external"
5. `ComponentSWCVId` = "1.5.2"
6. `clientCertificates` = "" (empty but required)
7. **Property name**: `address` → `urlPath`

---

## 2. Content Modifier (Enricher)

### Evidence Source
ComponentRegistry line 86: `ctype::FlowstepVariant/cname::Enricher/version::1.6.3`

### Check: Default Properties
From ComponentRegistry defaultProperties:
```typescript
bodyType: "constant",
propertyTable: "",
headerTable: "",
wrapContent: ""
```

### Verification Needed
- Ensure all 4 default properties present
- Check if `Name` and `Description` required (standard for all components)

---

## 3. Router (ExclusiveGateway)

### Evidence Source
ComponentRegistry line 125-136: IPRO_PRODUCT_HTTP export lines 932-955

### From ComponentRegistry
```typescript
activityType: "ExclusiveGateway",
cmdVariantUri: "ctype::FlowstepVariant/cname::ExclusiveGateway/version::1.1.2",
componentVersion: "1.1",
defaultProperties: {
    throwException: "false"
}
```

### Verification Needed
- Check for `default` attribute on exclusiveGateway element (specifies default route ID)
- Check for `Name` and `Description` properties

---

## 4. XML Validator

### Evidence Source
ComponentRegistry line 418-458: POC.iflw lines 756-789

### From ComponentRegistry
```typescript
activityType: "XmlValidator",
cmdVariantUri: "ctype::FlowstepVariant/cname::XmlValidator/version::2.2.3",
componentVersion: "2.2",
defaultProperties: {
    xmlSchemaSource: "iflowOption",
    preventException: "false",
    xsd: "",
    headerSource: ""
}
```

### Current Configuration
```typescript
xmlSchemaSource: "iflowOption",
xsd: "/xsd/Order.xsd",
preventException: "false"
```

### Missing Properties
1. `headerSource` = "" (default property)
2. `Name` and `Description` (standard)

### Resource Verification
- XSD file packaged: ✅ `src/main/resources/xsd/Order.xsd`
- Path reference: `/xsd/Order.xsd` (check if SAP expects full path or just filename)

---

## 5. XSLT Mapping

### Evidence Source
ComponentRegistry line 493-513: POC2.iflw lines 756-801

### From ComponentRegistry
```typescript
activityType: "Mapping",
subActivityType: "XSLTMapping",
cmdVariantUri: "ctype::FlowstepVariant/cname::XSLTMapping/version::1.2.0",
componentVersion: "1.2",
defaultProperties: {
    mappingoutputformat: "Bytes",
    mappinguri: "",
    mappingname: "",
    mappingpath: "src/main/resources/mapping/",
    mappingSource: "mappingSrcIflow",
    mappingHeaderNameKey: ""
}
```

### Current Configuration
```typescript
mappingname: "OrderToOData",
mappinguri: "dir://mapping/xslt/src/main/resources/mapping/OrderToOData.xsl",
mappingpath: "src/main/resources/mapping/",
mappingSource: "mappingSrcIflow",
mappingoutputformat: "Bytes"
```

### Missing Properties
1. `mappingHeaderNameKey` = "" (default property)
2. `Name` and `Description` (standard)

### Resource Verification
- XSLT file packaged: ✅ `src/main/resources/mapping/OrderToOData.xsl`
- Path reference format: Check if `dir://mapping/xslt/...` is correct

---

## 6. OData Receiver

### Evidence Source
ComponentRegistry line 392-412 (inferred from MessageMapping which is similar)

### Required Properties (from similar adapters)
Based on HTTPS Sender pattern, likely needs:
1. `Description` = ""
2. `Name` = "OData"
3. `TransportProtocolVersion` = "1.30.1"
4. `ComponentSWCVName` = "external"
5. `ComponentSWCVId` = "1.30.1"

---

## Standard Properties (All Components)

Every SAP component appears to require:
1. `Name` - Display name (matches component name)
2. `Description` - Description text (can be empty)

---

## Action Plan

### Phase 1: Fix HttpAdapter.sender()
Location: `src/model/HttpAdapter.ts`

Add missing properties in sender() static method:
```typescript
{
    urlPath: config.address,           // Changed from address
    Name: config.name || `${protocol} Sender`,
    Description: "",
    TransportProtocolVersion: protocol === "HTTPS" ? "1.5.2" : "1.16.1",
    ComponentSWCVName: "external",
    ComponentSWCVId: protocol === "HTTPS" ? "1.5.2" : "1.16.1",
    clientCertificates: "",
    // ... existing properties
}
```

### Phase 2: Fix ODataAdapter.receiver()
Location: `src/model/ODataAdapter.ts`

Add missing properties:
```typescript
{
    Name: config.name,
    Description: "",
    TransportProtocolVersion: version === "V2" ? "1.30.1" : "1.0.0",
    ComponentSWCVName: "external",
    ComponentSWCVId: version === "V2" ? "1.30.1" : "1.0.0",
    // ... existing properties
}
```

### Phase 3: Check Component Default Properties
Location: `src/registry/ComponentRegistry.ts`

Verify all defaultProperties are complete:

**Enricher**: ✅ Has bodyType, propertyTable, headerTable, wrapContent

**Router**: Add missing:
- Check if needs `Name`, `Description`

**XmlValidator**: Add missing:
- `headerSource: ""`

**XSLTMapping**: Add missing:
- `mappingHeaderNameKey: ""`

### Phase 4: Verify Resource Paths

**XSD**: Check if `/xsd/Order.xsd` is correct format
**XSLT**: Check if `dir://mapping/xslt/src/main/resources/mapping/OrderToOData.xsl` is correct

---

## Implementation Strategy

1. **DO NOT modify serializers** - Only update adapter/component SDK classes
2. **Minimal changes** - Add only missing properties identified above
3. **Test after each fix** - Generate new MinimalDemo.zip and import to SAP
4. **Verify validation clears** - Check each component's red marker

---

## Expected Outcome

Zero validation errors on all components:
- ✅ HTTPS Sender
- ✅ Content Modifier
- ✅ Router
- ✅ XML Validator
- ✅ XSLT Mapping
- ✅ OData Receiver

iFlow deployable without configuration errors.
