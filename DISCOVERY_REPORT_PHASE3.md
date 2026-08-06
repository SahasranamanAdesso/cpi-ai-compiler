# Phase 3 Discovery Report

**Date**: 2026-08-05  
**Sprint**: Phase 3 - Components & Adapters Discovery  
**Status**: ✅ COMPLETE - Evidence-based analysis

---

## Executive Summary

**Searched**: Complete Knowledge Base (POC1, POC2, IPRO exports, ARR documents)  
**Components Analyzed**: 10 (5 processing components + 5 adapters)  
**Evidence Found**: 8/10 components (80% coverage)  
**High Confidence**: 6 components ready for implementation  
**Medium Confidence**: 2 components need more evidence  
**No Evidence**: 2 components (IDoc, SOAP adapters)

---

## 1. XML Validator

### Evidence
- **Found**: ✅ YES
- **Source**: `POC.iflw` lines 756-789
- **Confidence**: **95%** ✅

### Component Metadata
```xml
<bpmn2:callActivity id="CallActivity_62" name="XML Validator">
    <ifl:property>
        <key>xmlSchemaSource</key>
        <value>iflowOption</value>
    </ifl:property>
    <ifl:property>
        <key>preventException</key>
        <value>false</value>
    </ifl:property>
    <ifl:property>
        <key>xsd</key>
        <value>/xsd/ProductTarget.xsd</value>
    </ifl:property>
    <ifl:property>
        <key>componentVersion</key>
        <value>2.2</value>
    </ifl:property>
    <ifl:property>
        <key>activityType</key>
        <value>XmlValidator</value>
    </ifl:property>
    <ifl:property>
        <key>cmdVariantUri</key>
        <value>ctype::FlowstepVariant/cname::XmlValidator/version::2.2.3</value>
    </ifl:property>
    <ifl:property>
        <key>headerSource</key>
        <value/>
    </ifl:property>
</bpmn2:callActivity>
```

### Reusable Patterns
- ✅ **XsdResource** - Already implemented for Message Mapping
- ✅ **CallActivity pattern** - Same as Content Modifier, Router, Groovy
- ✅ **Resource packaging** - xsd/ directory already supported in IflowPackager

### Key Properties
1. `xmlSchemaSource` - Source of XSD (iflowOption/header)
2. `preventException` - Whether to throw exception on validation failure
3. `xsd` - Path to XSD schema file
4. `headerSource` - Header name containing XSD path (if source=header)

### Implementation Effort
**LOW** - All patterns exist, XsdResource class ready

### Recommendation
✅ **READY TO IMPLEMENT** - Priority 1

---

## 2. XSLT Mapping

### Evidence
- **Found**: ✅ YES
- **Source**: `POC2.iflw` lines 756-801 + `XSLTMapping1.xsl`
- **Confidence**: **95%** ✅

### Component Metadata
```xml
<bpmn2:callActivity id="CallActivity_62" name="XSLT_FormoneXML">
    <ifl:property>
        <key>mappingoutputformat</key>
        <value>Bytes</value>
    </ifl:property>
    <ifl:property>
        <key>mappinguri</key>
        <value>dir://mapping/xslt/src/main/resources/mapping/XSLTMapping1.xsl</value>
    </ifl:property>
    <ifl:property>
        <key>mappingname</key>
        <value>XSLTMapping1</value>
    </ifl:property>
    <ifl:property>
        <key>mappingHeaderNameKey</key>
        <value/>
    </ifl:property>
    <ifl:property>
        <key>mappingpath</key>
        <value>src/main/resources/mapping/XSLTMapping1</value>
    </ifl:property>
    <ifl:property>
        <key>mappingSource</key>
        <value>mappingSrcIflow</value>
    </ifl:property>
    <ifl:property>
        <key>componentVersion</key>
        <value>1.2</value>
    </ifl:property>
    <ifl:property>
        <key>activityType</key>
        <value>Mapping</value>
    </ifl:property>
    <ifl:property>
        <key>cmdVariantUri</key>
        <value>ctype::FlowstepVariant/cname::XSLTMapping/version::1.2.0</value>
    </ifl:property>
    <ifl:property>
        <key>subActivityType</key>
        <value>XSLTMapping</value>
    </ifl:property>
</bpmn2:callActivity>
```

### Real XSLT File Found
**Location**: `C:\Sahas\adesso\CPI_AI\temp_poc2_analysis\src\main\resources\mapping\XSLTMapping1.xsl`

### Reusable Patterns
- ✅ **MappingResource pattern** - Similar to MessageMapping (.mmap files)
- ✅ **CallActivity pattern** - Same structure as other components
- ✅ **Resource packaging** - Create XsltResource class (similar to MappingResource)

### Key Properties
1. `mappingoutputformat` - Output format (Bytes/String)
2. `mappinguri` - URI to .xsl file
3. `mappingname` - Name of mapping
4. `mappingpath` - Path in package
5. `mappingSource` - Source of mapping (iflow/header)
6. `activityType` - "Mapping"
7. `subActivityType` - "XSLTMapping"

### Implementation Effort
**LOW** - Near-identical to MessageMapping pattern

### Recommendation
✅ **READY TO IMPLEMENT** - Priority 2

---

## 3. Local Integration Process

### Evidence
- **Found**: ✅ YES
- **Source**: `POC.iflw` lines 530-546
- **Confidence**: **90%** ✅

### Component Metadata
```xml
<bpmn2:subProcess id="Process_16" name="LP_RR_GetProductDesc">
    <bpmn2:extensionElements>
        <ifl:property>
            <key>processType</key>
            <value>directCall</value>
        </ifl:property>
        <ifl:property>
            <key>componentVersion</key>
            <value>1.1</value>
        </ifl:property>
        <ifl:property>
            <key>cmdVariantUri</key>
            <value>ctype::FlowElementVariant/cname::LocalIntegrationProcess/version::1.1.3</value>
        </ifl:property>
        <ifl:property>
            <key>transactionalHandling</key>
            <value>From Calling Process</value>
        </ifl:property>
    </bpmn2:extensionElements>
    <!-- Contains its own start/end events and processing components -->
</bpmn2:subProcess>
```

### Reusable Patterns
- ⚠️ **NEW PATTERN REQUIRED** - This is a `<bpmn2:subProcess>`, not `<callActivity>`
- ⚠️ **Nested structure** - Subprocess contains its own flow (Start → Components → End)
- ✅ **Existing IR** - BpmnProcess already used for main process

### Key Properties
1. `processType` - "directCall" (vs "integration" for main process)
2. `transactionalHandling` - "From Calling Process" / "Required for JDBC" / "Not Required"
3. Subprocess contains nested BPMN elements (startEvent, components, endEvent)

### Implementation Effort
**MEDIUM** - Requires subprocess nesting in IR + new SDK class

### Recommendation
✅ **READY TO IMPLEMENT** - Priority 5 (needs subprocess architecture)

---

## 4. Exception Subprocess

### Evidence
- **Found**: ✅ YES
- **Source**: `POC.iflw` lines 648-755
- **Confidence**: **90%** ✅

### Component Metadata
```xml
<bpmn2:subProcess id="SubProcess_47" name="Exception Subprocess 1">
    <bpmn2:extensionElements>
        <ifl:property>
            <key>componentVersion</key>
            <value>1.1</value>
        </ifl:property>
        <ifl:property>
            <key>activityType</key>
            <value>ErrorEventSubProcessTemplate</value>
        </ifl:property>
        <ifl:property>
            <key>cmdVariantUri</key>
            <value>ctype::FlowstepVariant/cname::ErrorEventSubProcessTemplate/version::1.1.0</value>
        </ifl:property>
    </bpmn2:extensionElements>
    <bpmn2:startEvent id="StartEvent_48" name="Error Start 1">
        <bpmn2:errorEventDefinition>
            <bpmn2:extensionElements>
                <ifl:property>
                    <key>cmdVariantUri</key>
                    <value>ctype::FlowstepVariant/cname::ErrorStartEvent</value>
                </ifl:property>
                <ifl:property>
                    <key>activityType</key>
                    <value>StartErrorEvent</value>
                </ifl:property>
            </bpmn2:extensionElements>
        </bpmn2:errorEventDefinition>
    </bpmn2:startEvent>
    <bpmn2:endEvent id="EndEvent_51" name="Error End 1">
        <bpmn2:errorEventDefinition>
            <!-- Error end event -->
        </bpmn2:errorEventDefinition>
    </bpmn2:endEvent>
    <!-- Exception handling components in between -->
</bpmn2:subProcess>
```

### Reusable Patterns
- ⚠️ **NEW PATTERN REQUIRED** - Special subprocess with error events
- ⚠️ **Error events** - StartErrorEvent and ErrorEndEvent (not used in main flow)
- ✅ **Subprocess structure** - Similar to Local Integration Process

### Key Properties
1. `activityType` - "ErrorEventSubProcessTemplate"
2. Contains `<errorEventDefinition>` elements
3. Special start event type: "StartErrorEvent"
4. Can contain error handling components (Send Mail, Content Modifier, etc.)

### Implementation Effort
**MEDIUM** - Requires error event support + subprocess architecture

### Recommendation
✅ **READY TO IMPLEMENT** - Priority 6 (needs subprocess + error events)

---

## 5. Process Call

### Evidence
- **Found**: ✅ YES
- **Source**: `POC.iflw` lines 1058-1081
- **Confidence**: **95%** ✅

### Component Metadata
```xml
<bpmn2:callActivity id="CallActivity_13" name="ProcessCall_LP_GetProductDesc">
    <bpmn2:extensionElements>
        <ifl:property>
            <key>processId</key>
            <value>Process_16</value>
        </ifl:property>
        <ifl:property>
            <key>componentVersion</key>
            <value>1.0</value>
        </ifl:property>
        <ifl:property>
            <key>activityType</key>
            <value>ProcessCallElement</value>
        </ifl:property>
        <ifl:property>
            <key>cmdVariantUri</key>
            <value>ctype::FlowstepVariant/cname::NonLoopingProcess/version::1.0.4</value>
        </ifl:property>
        <ifl:property>
            <key>subActivityType</key>
            <value>NonLoopingProcess</value>
        </ifl:property>
    </bpmn2:extensionElements>
</bpmn2:callActivity>
```

### Reusable Patterns
- ✅ **CallActivity pattern** - Same structure as other components
- ✅ **Process reference** - Links to Local Integration Process by ID

### Key Properties
1. `processId` - ID of the Local Integration Process to call
2. `activityType` - "ProcessCallElement"
3. `subActivityType` - "NonLoopingProcess" (vs "LoopingProcess" for iterating)

### Implementation Effort
**LOW** - Simple CallActivity, requires Local Integration Process to exist first

### Recommendation
✅ **READY TO IMPLEMENT** - Priority 4 (depends on Local Integration Process)

---

## 6. HTTP Adapter

### Evidence
- **Found**: ✅ YES
- **Source**: 
  - HTTPS Sender: `IPRO_PRODUCT_HTTP.iflw` lines 608-670
  - HTTP Receiver: `IPRO_PRODUCT_HTTP.iflw` lines 188-362
- **Confidence**: **90%** ✅

### Sender Metadata (HTTPS)
```xml
<bpmn2:messageFlow id="MessageFlow_4" name="HTTPS" sourceRef="Participant_1" targetRef="StartEvent_2">
    <bpmn2:extensionElements>
        <ifl:property>
            <key>ComponentType</key>
            <value>HTTPS</value>
        </ifl:property>
        <ifl:property>
            <key>Description</key>
            <value/>
        </ifl:property>
        <ifl:property>
            <key>maximumBodySize</key>
            <value>40</value>
        </ifl:property>
        <ifl:property>
            <key>componentVersion</key>
            <value>1.5</value>
        </ifl:property>
        <ifl:property>
            <key>system</key>
            <value>Sender</value>
        </ifl:property>
        <ifl:property>
            <key>xsrfProtection</key>
            <value>0</value>
        </ifl:property>
        <ifl:property>
            <key>TransportProtocol</key>
            <value>HTTPS</value>
        </ifl:property>
        <ifl:property>
            <key>cmdVariantUri</key>
            <value>ctype::AdapterVariant/cname::sap:HTTPS/tp::HTTPS/mp::None/direction::Sender/version::1.5.2</value>
        </ifl:property>
        <ifl:property>
            <key>userRole</key>
            <value>IPRO</value>
        </ifl:property>
        <ifl:property>
            <key>senderAuthType</key>
            <value>RoleBased</value>
        </ifl:property>
        <ifl:property>
            <key>MessageProtocol</key>
            <value>None</value>
        </ifl:property>
        <ifl:property>
            <key>MessageProtocolVersion</key>
            <value>1.5.2</value>
        </ifl:property>
        <ifl:property>
            <key>ComponentNS</key>
            <value>sap</value>
        </ifl:property>
        <ifl:property>
            <key>allowedMethods</key>
            <value>POST,GET</value>
        </ifl:property>
        <ifl:property>
            <key>address</key>
            <value>/IPRO/Product</value>
        </ifl:property>
    </bpmn2:extensionElements>
</bpmn2:messageFlow>
```

### Receiver Metadata (HTTP)
```xml
<bpmn2:messageFlow id="MessageFlow_6" name="HTTP" sourceRef="EndEvent_2" targetRef="Participant_3">
    <bpmn2:extensionElements>
        <ifl:property>
            <key>allowedResponseHeaders</key>
            <value>*</value>
        </ifl:property>
        <ifl:property>
            <key>httpMethod</key>
            <value>POST</value>
        </ifl:property>
        <ifl:property>
            <key>credentialName</key>
            <value>IPRO_DIP</value>
        </ifl:property>
        <ifl:property>
            <key>authenticationMethod</key>
            <value>Basic</value>
        </ifl:property>
        <ifl:property>
            <key>componentVersion</key>
            <value>1.16</value>
        </ifl:property>
        <ifl:property>
            <key>TransportProtocol</key>
            <value>HTTP</value>
        </ifl:property>
        <ifl:property>
            <key>cmdVariantUri</key>
            <value>ctype::AdapterVariant/cname::sap:HTTP/tp::HTTP/mp::None/direction::Receiver/version::1.16.1</value>
        </ifl:property>
        <ifl:property>
            <key>MessageProtocol</key>
            <value>None</value>
        </ifl:property>
        <ifl:property>
            <key>MessageProtocolVersion</key>
            <value>1.16.1</value>
        </ifl:property>
        <ifl:property>
            <key>ComponentNS</key>
            <value>sap</value>
        </ifl:property>
        <ifl:property>
            <key>ComponentType</key>
            <value>HTTP</value>
        </ifl:property>
    </bpmn2:extensionElements>
</bpmn2:messageFlow>
```

### Reusable Patterns
- ⚠️ **NEW PATTERN** - Adapters use `<bpmn2:messageFlow>`, not `<callActivity>`
- ⚠️ **Participant linking** - MessageFlow connects Participant to Start/End events
- ✅ **Direction-aware** - Same adapter has Sender and Receiver variants

### Key Properties (Sender)
1. `address` - Endpoint path (e.g., "/IPRO/Product")
2. `allowedMethods` - HTTP methods (POST, GET, etc.)
3. `senderAuthType` - Authentication type
4. `userRole` - Required role
5. `xsrfProtection` - XSRF token protection
6. `maximumBodySize` - Max request size (MB)

### Key Properties (Receiver)
1. `httpMethod` - HTTP method to use
2. `authenticationMethod` - Auth type (Basic, OAuth, etc.)
3. `credentialName` - Credential alias
4. `allowedResponseHeaders` - Headers to capture

### Implementation Effort
**MEDIUM** - New messageFlow architecture + direction handling

### Recommendation
✅ **READY TO IMPLEMENT** - Priority 3 (high demo value)

---

## 7. OData Adapter

### Evidence
- **Found**: ✅ YES
- **Source**: `POC.iflw` lines 210-360
- **Confidence**: **85%** ✅

### Receiver Metadata (OData V2)
```xml
<bpmn2:messageFlow id="MessageFlow_10" name="OData V2" sourceRef="EndEvent_9" targetRef="Participant_5">
    <bpmn2:extensionElements>
        <ifl:property>
            <key>TransportProtocol</key>
            <value>HTTP</value>
        </ifl:property>
        <ifl:property>
            <key>cmdVariantUri</key>
            <value>ctype::AdapterVariant/cname::sap:HCIOData/tp::HTTP/mp::OData V2/direction::Receiver/version::1.30.1</value>
        </ifl:property>
        <ifl:property>
            <key>ComponentType</key>
            <value>HCIOData</value>
        </ifl:property>
        <ifl:property>
            <key>MessageProtocol</key>
            <value>OData V2</value>
        </ifl:property>
        <ifl:property>
            <key>odataResourcePath</key>
            <value>ProductCollection</value>
        </ifl:property>
        <ifl:property>
            <key>odataOperationType</key>
            <value>Create</value>
        </ifl:property>
        <ifl:property>
            <key>odataConnectionTimeout</key>
            <value>60000</value>
        </ifl:property>
        <ifl:property>
            <key>authenticationMethod</key>
            <value>Basic</value>
        </ifl:property>
        <ifl:property>
            <key>credentialName</key>
            <value/>
        </ifl:property>
    </bpmn2:extensionElements>
</bpmn2:messageFlow>
```

### Reusable Patterns
- ✅ **MessageFlow pattern** - Same as HTTP Adapter
- ✅ **Participant linking** - Same architecture
- ✅ **Direction-aware** - Can be Sender or Receiver

### Key Properties
1. `odataResourcePath` - OData entity set (e.g., "ProductCollection")
2. `odataOperationType` - Operation (Create, Read, Update, Delete, Query)
3. `MessageProtocol` - "OData V2" or "OData V4"
4. `odataConnectionTimeout` - Timeout in ms
5. `authenticationMethod` - Auth type
6. `credentialName` - Credential alias

### Implementation Effort
**MEDIUM** - Same messageFlow pattern as HTTP, different properties

### Recommendation
✅ **READY TO IMPLEMENT** - Priority 7 (after HTTP adapter)

---

## 8. SFTP Adapter

### Evidence
- **Found**: ⚠️ PARTIAL
- **Source**: Mentioned in `COMPLETION_REPORT.md` line 416 (future work list)
- **Confidence**: **50%** ⚠️

### Available Information
- No direct evidence in POC1, POC2, or IPRO exports
- Likely follows same messageFlow pattern as HTTP/OData
- Standard SAP adapter structure expected

### Expected Metadata (Based on Pattern)
```xml
<bpmn2:messageFlow>
    <ifl:property>
        <key>ComponentType</key>
        <value>SFTP</value>
    </ifl:property>
    <ifl:property>
        <key>TransportProtocol</key>
        <value>SFTP</value>
    </ifl:property>
    <ifl:property>
        <key>cmdVariantUri</key>
        <value>ctype::AdapterVariant/cname::sap:SFTP/tp::SFTP/mp::File/direction::Sender/version::?</value>
    </ifl:property>
    <!-- Directory, file pattern, authentication, etc. -->
</bpmn2:messageFlow>
```

### Reusable Patterns
- ✅ **MessageFlow pattern** - Same as HTTP/OData
- ❓ **File-specific properties** - Directory, file pattern, polling interval

### Implementation Effort
**MEDIUM** - Pattern known, need real SAP export for property schema

### Recommendation
⚠️ **NEEDS MORE EVIDENCE** - Search for SFTP in additional SAP exports or create test flow in SAP

---

## 9. IDoc Adapter

### Evidence
- **Found**: ❌ NO
- **Source**: None in Knowledge Base
- **Confidence**: **0%** ❌

### Available Information
- No evidence found in POC1, POC2, or IPRO exports
- Mentioned in registry metadata comments but no actual implementation
- SAP-specific adapter (requires S/4HANA backend)

### Implementation Effort
**HIGH** - No evidence available

### Recommendation
❌ **NO EVIDENCE** - Requires SAP export with IDoc adapter OR skip for now

---

## 10. SOAP Adapter

### Evidence
- **Found**: ❌ NO
- **Source**: None in Knowledge Base
- **Confidence**: **0%** ❌

### Available Information
- No evidence found in POC1, POC2, or IPRO exports
- Mentioned in `COMPLETION_REPORT.md` line 416 (future work list)
- Standard SAP adapter, likely follows messageFlow pattern

### Implementation Effort
**HIGH** - No evidence available, need real SAP export

### Recommendation
❌ **NO EVIDENCE** - Requires SAP export with SOAP adapter OR skip for now

---

## Priority Matrix

Components sorted by:
1. Highest confidence (Evidence strength)
2. Lowest implementation effort (Reuses existing patterns)
3. Highest demo value (Visible impact)

| Priority | Component | Evidence | Confidence | Effort | Reuses Patterns | Demo Value | Recommendation |
|----------|-----------|----------|------------|--------|-----------------|------------|----------------|
| **1** | **XML Validator** | ✅ POC.iflw | 95% | LOW | XsdResource, CallActivity | High | **READY** ✅ |
| **2** | **XSLT Mapping** | ✅ POC2.iflw + .xsl | 95% | LOW | MappingResource, CallActivity | High | **READY** ✅ |
| **3** | **HTTP Adapter** | ✅ IPRO.iflw (both) | 90% | MEDIUM | New messageFlow pattern | **Very High** | **READY** ✅ |
| **4** | **Process Call** | ✅ POC.iflw | 95% | LOW | CallActivity | Medium | **READY** ✅ |
| **5** | **Local Integration Process** | ✅ POC.iflw | 90% | MEDIUM | New subprocess pattern | Medium | **READY** ✅ |
| **6** | **Exception Subprocess** | ✅ POC.iflw | 90% | MEDIUM | Subprocess + error events | Medium | **READY** ✅ |
| **7** | **OData Adapter** | ✅ POC.iflw | 85% | MEDIUM | MessageFlow (same as HTTP) | High | **READY** ✅ |
| **8** | **SFTP Adapter** | ⚠️ Partial | 50% | MEDIUM | MessageFlow pattern | Medium | **NEEDS EVIDENCE** ⚠️ |
| **9** | **SOAP Adapter** | ❌ None | 0% | HIGH | Unknown | Medium | **NO EVIDENCE** ❌ |
| **10** | **IDoc Adapter** | ❌ None | 0% | HIGH | Unknown | Low | **NO EVIDENCE** ❌ |

---

## Recommended Sprint Structure

### **Sprint 3.1 - Quick Wins (Components with CallActivity pattern)**
**Effort**: 2-3 days  
**Risk**: Low (all patterns exist)

1. ✅ **XML Validator** - Validates XML against XSD schema
2. ✅ **XSLT Mapping** - Transforms XML using XSLT stylesheets
3. ✅ **Process Call** - Calls Local Integration Process (prep for 3.2)

**Deliverables**:
- SDK classes: `XmlValidator.ts`, `XsltMapping.ts`, `XsltResource.ts`, `ProcessCall.ts`
- Registry entries with complete metadata
- Demo integration flows with ZIP packages
- SAP validation screenshots

---

### **Sprint 3.2 - Subprocess Architecture**
**Effort**: 3-4 days  
**Risk**: Medium (new IR pattern - subprocess nesting)

1. ✅ **Local Integration Process** - Callable subprocess
2. ✅ **Exception Subprocess** - Error handling subprocess

**Deliverables**:
- IR enhancement: `BpmnSubProcess.ts` class
- SDK classes: `LocalIntegrationProcess.ts`, `ExceptionSubprocess.ts`
- Writer: `SubProcessWriter.ts`
- Demo flows showing subprocess invocation
- SAP validation

---

### **Sprint 3.3 - Adapters (MessageFlow pattern)**
**Effort**: 4-5 days  
**Risk**: Medium (new messageFlow architecture)

1. ✅ **HTTP Adapter** - HTTP/HTTPS Sender and Receiver
2. ✅ **OData Adapter** - OData V2/V4 Receiver

**Deliverables**:
- IR enhancement: `BpmnMessageFlow.ts` class
- SDK classes: `HttpAdapter.ts`, `ODataAdapter.ts`
- Writer: `MessageFlowWriter.ts`
- Adapter direction handling (Sender vs Receiver)
- Demo flows with external system integration
- SAP validation

---

### **Sprint 3.4 - Evidence Gathering (Optional)**
**Effort**: 1-2 days  
**Risk**: Low (discovery only)

1. ⚠️ **SFTP Adapter** - Create test flow in SAP, export, reverse engineer
2. ❌ **SOAP Adapter** - Same process
3. ❌ **IDoc Adapter** - Same process (requires S/4HANA backend)

**Deliverables**:
- New SAP exports with missing adapters
- Updated discovery report
- Implementation readiness assessment

---

## Architecture Impact

### New IR Classes Required

1. **BpmnSubProcess** (Sprint 3.2)
   ```typescript
   class BpmnSubProcess extends BpmnNode {
       processType: 'integration' | 'directCall' | 'errorEventSubprocess'
       nodes: BpmnNode[]
       flows: BpmnSequenceFlow[]
       startEvent: BpmnNode
       endEvent: BpmnNode
   }
   ```

2. **BpmnMessageFlow** (Sprint 3.3)
   ```typescript
   class BpmnMessageFlow {
       id: string
       name: string
       sourceRef: string  // Participant or EndEvent
       targetRef: string  // Participant or StartEvent
       direction: 'Sender' | 'Receiver'
       adapterType: string  // HTTP, OData, SFTP, SOAP, IDoc
       properties: Record<string, any>
   }
   ```

### New Writer Classes Required

1. **SubProcessWriter** - Handles `<bpmn2:subProcess>` generation
2. **MessageFlowWriter** - Handles `<bpmn2:messageFlow>` generation
3. **ErrorEventWriter** - Handles error events in exception subprocesses

### Packager Enhancements

Already supports:
- ✅ `xsd/` directory (XmlValidator, MessageMapping)
- ✅ `mapping/` directory (MessageMapping, XSLT)

Need to add:
- None - all resource types covered

---

## Evidence Summary

### High-Quality Evidence (95%+ Confidence)
- ✅ XML Validator (POC.iflw)
- ✅ XSLT Mapping (POC2.iflw + real .xsl file)
- ✅ Process Call (POC.iflw)

### Good Evidence (85-90% Confidence)
- ✅ Local Integration Process (POC.iflw)
- ✅ Exception Subprocess (POC.iflw)
- ✅ HTTP Adapter (IPRO.iflw - both Sender and Receiver)
- ✅ OData Adapter (POC.iflw)

### Partial Evidence (50% Confidence)
- ⚠️ SFTP Adapter (mentioned in docs, no actual export)

### No Evidence (0% Confidence)
- ❌ SOAP Adapter
- ❌ IDoc Adapter

---

## Risk Assessment

### Low Risk (Safe to implement)
- XML Validator ✅
- XSLT Mapping ✅
- Process Call ✅

### Medium Risk (New patterns, good evidence)
- Local Integration Process ⚠️ (subprocess nesting)
- Exception Subprocess ⚠️ (error events)
- HTTP Adapter ⚠️ (messageFlow pattern)
- OData Adapter ⚠️ (same as HTTP)

### High Risk (Missing evidence)
- SFTP Adapter ❌
- SOAP Adapter ❌
- IDoc Adapter ❌

---

## Success Criteria

Each component MUST:
1. ✅ Have real SAP export evidence (BPMN + properties)
2. ✅ Generate valid .iflw file matching SAP structure
3. ✅ Import successfully into SAP Integration Suite
4. ✅ Open in graphical editor without errors
5. ✅ Deploy and execute successfully
6. ✅ Follow validated patterns (CallActivity/Subprocess/MessageFlow)

---

## Next Steps

**Immediate Actions**:
1. ✅ Review this discovery report
2. ✅ Approve Sprint 3.1 scope (XML Validator, XSLT, Process Call)
3. ✅ Decide whether to gather SFTP/SOAP/IDoc evidence before proceeding

**Sprint 3.1 Kickoff**:
1. Implement XML Validator
2. Implement XSLT Mapping (create XsltResource class)
3. Implement Process Call
4. Generate demo flows
5. SAP validation
6. Mark as COMPLETE ✅

---

**Report Status**: ✅ COMPLETE  
**Evidence Coverage**: 80% (8/10 components)  
**Ready to Implement**: 7 components  
**Sprint 3 Scope**: Clear and achievable

