# XML Validator Component - BLOCKED

**Date:** 2026-07-24  
**Version:** 1.2.2  
**Status:** ❌ **BLOCKED - No Evidence Available**

---

## Engineering Principle Violation Risk

**Principle #7:**
> If evidence is missing: STOP, Document the gap, Do NOT guess.

**Principle #6:**
> Every SAP-specific value must be traceable to reverse engineering evidence.

---

## Missing Metadata

Cannot implement XML Validator because the following **required SAP metadata is UNKNOWN**:

### 1. Component Type / activityType ❌

**Unknown Values:**
- Technical name (e.g., "Enricher", "ScriptCollection", "???")
- activityType value for BPMN XML

**Evidence:** None available in reference SAP exports

**Guesses to AVOID:**
- ❌ "XMLValidator"
- ❌ "SchemaValidator"
- ❌ "Validator"
- ❌ "XSDValidator"

**Impact:** Cannot create Registry entry without this

---

### 2. cmdVariantUri ❌

**Unknown Value:**
```
ctype::FlowstepVariant/cname::???/version::???
```

**Evidence:** None available

**Guesses to AVOID:**
- ❌ Any cmdVariantUri without SAP export verification

**Impact:** Generated BPMN won't match SAP Integration Suite expectations

---

### 3. Component Version ❌

**Unknown Value:**
- Component version number (e.g., "1.0", "1.2", "2.0")

**Evidence:** None available

**Impact:** Version mismatch may cause import failures

---

### 4. Operation ❌

**Unknown Value:**
- Operation name (if used)

**Evidence:** None available

**Examples from other components:**
- Groovy Script: `operation: "Execute"`
- Router: `operation: "Route"`
- XML Validator: `operation: "???"` ❌ UNKNOWN

---

### 5. Resource Reference Pattern ❌

**Assumed but UNVERIFIED:**
```
schema/{name}.xsd
```

**Evidence:** None available (only mentioned in comments)

**Risk:** Path might be different in actual SAP Integration Suite

---

### 6. Default Properties ❌

**Unknown:**
- What default properties does XML Validator require?
- Are there validation mode options?
- Error handling configuration?

**Evidence:** None available

---

## Available Evidence

### ✅ What We Know (Verified)

1. **Groovy Script (ScriptCollection):**
   - activityType: "ScriptCollection"
   - operation: "Execute"
   - cmdVariantUri: "ctype::FlowstepVariant/cname::ScriptCollection/version::1.2.0"
   - componentVersion: "1.2"
   - resourceType: "groovy"
   - resourceReference: "script/{name}.groovy"
   - **Source:** Reference SAP export analysis

2. **Content Modifier (Enricher):**
   - activityType: "Enricher"
   - cmdVariantUri: "ctype::FlowstepVariant/cname::Enricher/version::1.6.3"
   - componentVersion: "1.6"
   - **Source:** Reference SAP export analysis

3. **Generic Resource Framework:**
   - Resource interface exists
   - Packager handles type-based routing
   - Pattern: `type → directory mapping`

### ❌ What We DON'T Know

**XML Validator component:**
- Everything ❌

---

## Research Attempted

### 1. Reference SAP Exports ❌

**Location:** `reference/sap-exports/agg-test/`

**Contents:**
- HTTPS Sender adapter
- Content Modifier (Enricher)
- HTTPS Receiver adapter

**Result:** No XML Validator component found

### 2. Documentation Search ❌

**Searched:**
- Registry files
- Documentation files
- Example files
- Resource definitions

**Result:** Only comments/mentions, no actual metadata

### 3. ComponentMetadata.ts ❌

**Found:**
- Comments mentioning XSD resources
- No actual XML Validator definition

---

## Alternatives

### Option 1: Export Real XML Validator from SAP ✅ RECOMMENDED

**Steps:**
1. Access SAP Integration Suite tenant
2. Create sample Integration Flow with XML Validator
3. Configure XSD schema
4. Export as .zip
5. Extract and analyze BPMN XML
6. Document all metadata values
7. Add to reference exports
8. Implement component with verified metadata

**Timeline:** 1-2 hours (including SAP access)

**Confidence:** 100% (verified metadata)

---

### Option 2: Use SAP API Designer Documentation ⚠️ RISKY

**Steps:**
1. Access official SAP Integration Suite documentation
2. Find XML Validator component specification
3. Extract metadata from official docs
4. Document source for traceability

**Timeline:** 2-4 hours (if documentation exists)

**Confidence:** 80% (depends on documentation quality)

**Risk:** Documentation may be outdated or incomplete

---

### Option 3: Implement Message Mapping Instead ✅ ALTERNATIVE

**Reason:** Router component has verified metadata in Registry

**Metadata Available:**
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

**Question:** Is this from verified SAP export or placeholder?

**Action Required:** Verify Router metadata source

---

### Option 4: Skip XML Validator, Implement Router ✅ SAFE

**Reason:**
- Router has Registry entry
- No resources required (simpler)
- Can verify architecture without resource complexity

**Timeline:** 2 hours

**Confidence:** High (if Router metadata is verified)

---

## Recommendation

**DO NOT IMPLEMENT XML VALIDATOR without verified metadata.**

**Recommended Path:**

1. ✅ **Immediate:** Verify Router metadata source
   - If verified → Implement Router (v1.2.2)
   - If not verified → Export from SAP

2. ✅ **Short-term:** Export XML Validator from SAP
   - Add to reference exports
   - Document metadata
   - Implement in v1.2.3

3. ✅ **Process:** Establish metadata verification workflow
   - All new components require SAP export evidence
   - Document metadata source in Registry comments
   - Maintain reference exports library

---

## Technical Debt Created

### If We Proceed Without Evidence

**Risks:**
1. ❌ Generated BPMN won't import into SAP Integration Suite
2. ❌ Metadata mismatch causes runtime errors
3. ❌ Wasted development time on incorrect implementation
4. ❌ False validation of architecture (seems to work, actually broken)
5. ❌ Sets bad precedent for guessing metadata

**Maintenance Cost:**
- Refactoring when real metadata discovered
- User confusion from broken examples
- Support burden from import failures

---

## Decision Required

**Question:** How to obtain verified XML Validator metadata?

**Options:**
A. Export from SAP Integration Suite tenant ✅ RECOMMENDED
B. Find official SAP documentation with metadata
C. Implement different component with verified metadata
D. Wait for metadata research to complete

**Current Status:** ⏸️ **PAUSED - Awaiting Decision**

---

## Engineering Principles Upheld ✅

1. ✅ Did not invent activityType
2. ✅ Did not guess cmdVariantUri
3. ✅ Did not fabricate component version
4. ✅ Documented gap clearly
5. ✅ Proposed evidence-based alternatives
6. ✅ Stopped before creating technical debt

**This is the correct engineering response to missing evidence.**

---

## Next Steps

**User Decision Required:**

1. **Provide XML Validator SAP export** → Implement immediately
2. **Use Router instead** → Verify metadata, implement v1.2.2
3. **Research SAP documentation** → Add 2-4 hours for research
4. **Skip resource component** → Implement Router/Data Store instead

---

**Blocked until metadata evidence available.**
