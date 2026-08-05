# SAP Integration SDK - Engineering Guidelines
**Version**: 2.0 (Optimized for Execution Efficiency)  
**Last Updated**: 2026-08-04

---

## Core Principles

1. **SAP Integration Suite is the specification. The compiler implements it.**

2. **Components are COMPLETE only after SAP validation.**
   - COMPLETE ≠ ZIP generated
   - COMPLETE = SAP imports + zero errors + configurable

3. **Optimize for SAP-compatible ZIP generation, not perfect metadata.**
   - 80% confidence → implement → ZIP → SAP validates → learn → refine
   - SAP feedback teaches faster than analysis
   - Metadata perfection comes FROM SAP, not before it

---

## I. Knowledge Base (Reusable Evidence)

### Primary Sources (Search in Order)
1. **ComponentRegistry.ts** - Single source of truth for implemented components
2. **Discovery Reports** (`DISCOVERY_REPORT_*.md`) - Cached component analysis
3. **Completion Reports** (`V*_COMPLETE.md`) - Validated implementations
4. **SAP Exports** (`reference/sap-exports/**/*.iflw`) - Ground truth BPMN
5. **Reverse Engineering Docs** (`docs/ARR-*.md`, `docs/*-REVERSE-*.md`)
6. **Examples** (`examples/*.ts`) - Working SDK usage patterns

### Cache-First Strategy
- ✅ **CHECK Registry FIRST** - If metadata exists, reuse it
- ✅ **CHECK Discovery Reports** - If component analyzed, reuse findings
- ✅ **CHECK Completion Reports** - If component validated, trust it
- ❌ **DO NOT re-scan** files already indexed in Discovery Reports
- ❌ **DO NOT re-extract** metadata already in Registry
- ❌ **DO NOT re-analyze** components with successful SAP validation

---

## II. Implementation Workflow

### Step 1: Quick Check (< 2 minutes)
```
1. grep "ComponentName" src/registry/ComponentRegistry.ts
   → Found? Use existing metadata → SKIP TO STEP 4
   
2. ls DISCOVERY_REPORT_*ComponentName*.md
   → Found? Read confidence & evidence → SKIP TO STEP 3
   
3. Search only if NOT found above
```

### Step 2: Discovery (Only if Step 1 fails)
**Create `DISCOVERY_REPORT_ComponentName.md`**:
- **Component**: Name
- **Evidence Sources**: File paths + line numbers
- **Existing Metadata**: What's known
- **Missing Metadata**: What's needed
- **Confidence**: % (based on evidence completeness)
- **Recommendation**: Implement | Search More | Block

**Confidence Thresholds**:
- **≥80%**: Implement now → Demo → ZIP → SAP validation → Refine
- **50-79%**: Search deeper OR implement with SAP validation as refinement
- **<50%**: Block until more evidence available

### Step 3: Implementation
**For ≥80% confidence components**:

1. **Create SDK Class** (30-60 min)
   - Pattern: Reuse Router/GroovyScript/DataStore patterns
   - Evidence comments: `// Evidence: filename.iflw lines X-Y`

2. **Update Registry** (15 min)
   - Copy evidence-backed metadata
   - Document source: `// Evidence: ...`

3. **Create Example** (30 min)
   - Follow existing example patterns
   - Add to package.json scripts

### Step 4: SAP Validation Loop (REQUIRED for COMPLETE status)
```
npm run build
npm run <component-name>    # Generates ZIP
→ Import ZIP into SAP Integration Suite
→ Visual editor opens? (YES/NO)
→ Structural validation errors? (count)
→ Component configurable? (YES/NO)

IF any issues:
    → Note what SAP shows
    → Refine metadata based on SAP feedback
    → Rebuild ZIP
    → Re-import
    → Repeat until zero errors

ONLY WHEN:
    ✓ ZIP imports successfully
    ✓ Visual editor opens
    ✓ Zero structural validation errors
    ✓ Component is configurable
    
THEN status = COMPLETE
```

**Status Definitions**:
- **READY FOR VALIDATION**: ZIP generated, not yet imported to SAP
- **IN VALIDATION**: Imported to SAP, refinement in progress
- **COMPLETE**: SAP validated with zero errors, component configurable

---

## III. Engineering Rules (Consolidated)

### Evidence-Based Development
1. **Metadata Origin**: All values from SAP exports or Registry - NEVER invented
2. **Registry = Truth**: ComponentRegistry.ts is authoritative source
3. **SAP = Validator**: Integration Suite validates correctness, not pre-analysis

### Architecture Constraints (Frozen)
- ❌ **DO NOT modify**: Writers (unless new BPMN element type), BPMN IR structure, Packaging logic
- ✅ **CAN modify**: Registry entries, Mapper (for new component types), SDK classes

### Quality Gates (COMPLETE Status Criteria)
- [ ] Evidence documented with file + line numbers
- [ ] Registry entry created (initial metadata)
- [ ] ZIP generated and importable
- [ ] **SAP: Imports without loader errors**
- [ ] **SAP: Visual editor opens successfully**
- [ ] **SAP: Zero structural validation markers**
- [ ] **SAP: Component properties are configurable**

**Until ALL SAP gates pass**: Status = READY FOR VALIDATION  
**After ALL SAP gates pass**: Status = COMPLETE

---

## IV. Token Optimization Rules

### Avoid Repeated Work
- ❌ Don't search the same file twice in one session
- ❌ Don't create Discovery Reports for Registry components
- ❌ Don't extract metadata already documented
- ❌ Don't analyze components with SAP validation success

### Prefer Action Over Analysis
- ✅ 80% confidence? → Implement → validate → refine
- ✅ Missing 2-3 properties? → Use defaults → SAP will show errors
- ✅ Unsure about property format? → Try it → SAP validates
- ✅ Found similar component? → Copy pattern → adjust → test

### Incremental Learning
After **every successful SAP validation**:
1. Update Registry with final metadata
2. Document in Completion Report
3. Future implementations reuse this knowledge

---

## V. Component Implementation Patterns

### Pattern 1: CallActivity Component (Content Modifier, Data Store, Groovy)
```typescript
// SDK Class (src/model/ComponentName.ts)
export class ComponentName extends Component {
    constructor(name: string, ...params) {
        super(id, name, "activityType", { properties });
    }
}

// Registry Entry
ComponentName: {
    displayName: "...",
    bpmnElement: "callActivity",
    activityType: "...",
    metadata: {
        activityType: "...",
        cmdVariantUri: "...",  // From SAP export
        componentVersion: "...",
        defaultProperties: { ... }
    }
}
```

### Pattern 2: Gateway Component (Router, Multicast)
```typescript
// SDK Class
export class GatewayName extends Component {
    // Special routing logic
}

// Registry Entry
GatewayName: {
    displayName: "...",
    bpmnElement: "exclusiveGateway" | "parallelGateway",
    activityType: "...",
    metadata: { ... }
}

// Mapper Update (if needed)
// BpmnProcessMapper: detect component → create gateway node
```

---

## VI. Quick Reference

### When to Search
- [ ] Component NOT in Registry
- [ ] No Discovery Report exists
- [ ] Confidence <80% after Registry check

### When to Implement
- [ ] Confidence ≥80%
- [ ] Evidence sources documented
- [ ] Similar pattern exists (Router, Groovy, DataStore)

### When to Block
- [ ] Confidence <50% after thorough search
- [ ] No SAP export found
- [ ] No similar pattern to follow

### SAP Validation Cycle (Learning Loop)
```
Implement (80% confidence)
    ↓
Build → Generate ZIP
    ↓
Import to SAP Integration Suite
    ↓
Check:
  - Visual editor opens? ____
  - Validation errors? ____
  - Component configurable? ____
    ↓
IF errors:
    SAP shows WHAT'S WRONG
    → Adjust metadata based on SAP feedback
    → Rebuild ZIP
    → Re-import
    → (Loop until zero errors)
    
WHEN zero errors:
    → Update Registry with SAP-validated metadata
    → Status = COMPLETE
    → Document in Completion Report
    → Reuse for future components

KEY: SAP is the teacher. Validation errors are lessons, not failures.
```

---

## VII. Example: Implementing a New Component (Optimized)

**Given**: User requests "Implement XML Validator"

### Optimized Approach (6 steps, ~2 hours)
```
1. grep "XMLValidator\|Validator" ComponentRegistry.ts (30 sec)
   → NOT FOUND

2. ls DISCOVERY_REPORT_*Validator*.md (10 sec)
   → NOT FOUND

3. Quick search SAP exports (5 min)
   grep -r "XMLValidator\|xmlValidator" reference/sap-exports/
   → FOUND in export-X.iflw lines 123-145
   
4. Extract metadata (10 min)
   activityType, cmdVariantUri, componentVersion, properties
   → Confidence: 85%
   
5. Implement (90 min)
   - Create XMLValidator.ts (copy DataStore pattern)
   - Update Registry with extracted metadata
   - Create example/xmlvalidator.ts
   - npm run build && npm run xmlvalidator
   
6. SAP Validation (15 min)
   - Import XMLValidatorDemo.zip
   - Zero errors? → Done
   - Errors found? → Refine property X → rebuild → re-import → success
   
TOTAL: ~2 hours (vs 4-6 hours with exhaustive pre-analysis)
```

---

## VIII. Anti-Patterns (What NOT to Do)

❌ **Over-Analysis**
- Spending 2 hours searching when 85% confidence is enough
- Extracting every possible property before trying SAP validation
- Creating elaborate Discovery Reports for simple components

❌ **Re-Work**
- Re-scanning files already indexed in prior Discovery Reports
- Re-extracting metadata already in Registry
- Re-validating components with successful SAP imports

❌ **Perfectionism**
- Blocking on "incomplete metadata" when 80% is sufficient
- Refusing to implement until 100% of properties known
- Ignoring SAP validation as the refinement mechanism

✅ **Correct Approach**
- Check Registry → Check Reports → Quick search → 80%? → Implement → SAP validates → Refine → Done
- Trust accumulated knowledge base
- Use SAP as the specification, not pre-analysis

---

## IX. Metrics & Continuous Improvement

### Track Per Component
- Time spent searching (target: <15 min for Registry components, <30 min for new)
- Time spent implementing (target: 1-2 hours)
- SAP validation cycles (target: 1-2 cycles to zero errors)

### Knowledge Base Growth
- Every validated component → Registry entry
- Every sprint → Completion Report
- Every discovery → Discovery Report
- Reuse rate should increase over time

---

## X. Version History

**v2.0** (2026-08-04):
- Added cache-first strategy
- Consolidated redundant rules
- Introduced confidence thresholds
- Token optimization guidance
- Incremental learning framework

**v1.4** (Referenced in conversation):
- Original CLAUDE.md with Discovery Phase requirement
- Detailed engineering rules
- Knowledge Base definition

---

**END OF ENGINEERING GUIDELINES**

**Remember**: Implement → Validate → Refine is faster than Analyze → Perfect → Implement.
