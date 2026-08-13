# CPI AI Integration Architect - Complete Project Context

**Document Purpose**: This file contains all essential context for Claude to continue development on this project from any machine.  
**Created**: 2026-08-13  
**Project Location**: `C:\Sahas\adesso\CPI_AI\sap-integration-sdk`  
**GitHub**: https://github.com/SahasranamanAdesso/cpi-ai_compiler

---

## 🎯 Project Vision

**What This Is**: An AI-powered TypeScript SDK that generates SAP Cloud Integration (CPI) Integration Flows from code instead of manual graphical configuration.

**Think**: GitHub Copilot for SAP Integration Suite

**Gap Filled**: 
- Existing tools: Monitoring, operations, API access
- This tool: AI-powered Integration Flow generation with Natural Language → Integration Flow in ~3 seconds

---

## 📊 Current Status

**Latest Version**: v1.3 (AI-First SDK)  
**Last Major Update**: 2026-08-04  
**Branch**: `feature/v1.1-ai`  
**Latest Tag**: `v1.3-ai-first-sdk`  
**Commit**: Check git log for latest

### What Works ✅

1. **Metadata-Driven Compiler** - Fully operational, zero hardcoded component logic
2. **SAP-Validated Components**:
   - Content Modifier (Enricher) - 100% verified
   - Router - 100% verified
   - Groovy Script - 100% verified
   - Data Store Operations (Get/Write) - 100% verified
   - Message Mapping - 100% verified
   - HTTPS Sender Adapter - 100% verified
   - HTTP Receiver Adapter - 100% verified

3. **AI Frontend** - Natural language to Integration Flow compiler
4. **Resource Framework** - Groovy scripts, XSD schemas, message mappings
5. **ZIP Packaging** - SAP-compatible .iflw bundles

### Architecture Status ✅

**Frozen Architecture** (Validated - No Changes Needed):
```
Component (Domain Model)
    ↓
Registry (SAP Metadata - SINGLE SOURCE OF TRUTH)
    ↓
ComponentMapper (Generic Translation)
    ↓
BpmnNode (IR - Intermediate Representation)
    ↓
CallActivityWriter (Generic XML Generation)
    ↓
BPMN XML
    ↓
Packager
    ↓
.iflw ZIP ready for SAP import
```

**Key Achievement**: New components added by SDK class + Registry entry ONLY, zero writer modifications required.

---

## 🏗️ Architecture Deep Dive

### Core Principles (MUST FOLLOW)

1. **SAP Integration Suite is the specification. The compiler implements it.**
2. **Components are COMPLETE only after SAP validation** (COMPLETE ≠ ZIP generated, COMPLETE = SAP imports + zero errors + configurable)
3. **Optimize for SAP-compatible ZIP generation, not perfect metadata** (80% confidence → implement → ZIP → SAP validates → learn → refine)

### Engineering Principles (Strictly Enforced)

1. ✅ Registry contains SAP semantics
2. ✅ Writers contain BPMN serialization only
3. ✅ Components are metadata-driven
4. ✅ No component-specific XML inside writers
5. ✅ Never invent SAP metadata
6. ✅ Every SAP value traceable to reverse engineering
7. ✅ **If evidence missing: STOP, Document, Don't guess**

### Metadata Sources Priority

1. **ComponentRegistry.ts** - Single source of truth for implemented components
2. **Discovery Reports** (`DISCOVERY_REPORT_*.md`) - Cached component analysis
3. **Completion Reports** (`V*_COMPLETE.md`) - Validated implementations
4. **SAP Exports** (`reference/sap-exports/**/*.iflw`) - Ground truth BPMN
5. **Reverse Engineering Docs** (`docs/ARR-*.md`)
6. **Examples** (`examples/*.ts`) - Working SDK usage patterns

---

## 📁 Project Structure

```
sap-integration-sdk/
├── src/
│   ├── model/               # Domain models (IFlow, Component classes)
│   │   ├── IFlow.ts        # Main integration flow model
│   │   ├── Component.ts    # Base component class
│   │   ├── GroovyScript.ts # Groovy script component
│   │   ├── Router.ts       # Router component
│   │   └── ...             # Other components
│   │
│   ├── registry/           # SAP metadata (SINGLE SOURCE OF TRUTH)
│   │   ├── ComponentRegistry.ts     # All SAP component metadata
│   │   └── ComponentMetadata.ts     # Metadata type definitions
│   │
│   ├── mapper/             # Model → IR transformation
│   │   ├── ComponentMapper.ts       # Component → BpmnNode (generic)
│   │   └── BpmnProcessMapper.ts     # IFlow → BpmnDefinitions
│   │
│   ├── ir/                 # Intermediate Representation
│   │   └── BpmnNode.ts     # Generic BPMN node structure
│   │
│   ├── writer/             # IR → XML (ALL GENERIC)
│   │   ├── CallActivityWriter.ts    # Generic CallActivity XML
│   │   ├── ProcessWriter.ts         # Process XML
│   │   └── BpmnWriter.ts            # Orchestrator
│   │
│   ├── serializer/         # XML → .iflw file
│   │   └── IflowSerializer.ts
│   │
│   └── packager/           # .iflw + resources → ZIP
│       └── IflowPackager.ts
│
├── examples/               # Working SDK examples
│   ├── helloworld.ts      # Content Modifier (verified)
│   ├── groovy-script.ts   # Groovy Script (verified)
│   ├── router-example.ts  # Router (verified)
│   └── ...                # Other examples
│
├── reference/             # SAP Integration Suite exports (GROUND TRUTH)
│   └── sap-exports/       # Real SAP .iflw files for reverse engineering
│       ├── agg-test/
│       ├── router-test/
│       └── ...
│
├── docs/                  # Documentation
│   ├── CLAUDE.md          # Engineering guidelines (READ THIS FIRST)
│   ├── README.md          # User-facing documentation
│   ├── ARCHITECTURE.md    # Detailed architecture
│   ├── AI_DOCUMENTATION_INDEX.md    # AI integration guide
│   ├── DISCOVERY_REPORT_*.md        # Component analysis cache
│   ├── V*_COMPLETE.md               # Version completion reports
│   └── ...
│
└── package.json           # Build scripts and dependencies
```

---

## 🔧 Key Files Explained

### Domain Model Layer (`src/model/`)

**IFlow.ts** - Main integration flow container
- Manages components, connections, resources
- `flow.addComponent(component)` - Add processing steps
- `flow.addResource(resource)` - Add scripts/mappings/schemas
- `flow.getResources()` - Retrieve all attached resources

**Component Classes** - User-friendly SDK API
- `ContentModifier` - Set headers/properties/body
- `Router` - Conditional routing with routes
- `GroovyScript` - Execute Groovy scripts
- `DataStore` - Get/Write data store operations
- `MessageMapping` - Message transformations
- Pattern: `new ComponentType("StepName", config)`

### Registry Layer (`src/registry/`)

**ComponentRegistry.ts** - ⭐ **MOST CRITICAL FILE** ⭐
- Single source of truth for ALL SAP metadata
- Every component's activityType, cmdVariantUri, componentVersion
- Every BPMN property definition
- All evidence documented: `// Evidence: filename.iflw lines X-Y`
- **Never modify writers - modify this file instead**

### Compiler Pipeline (`src/mapper/` → `src/writer/`)

**ComponentMapper.ts** - Generic Component → IR translation
- Queries Registry for metadata
- Creates generic BpmnNode structure
- No component-specific logic (all from Registry)

**Writers** - Generic BPMN XML serialization
- `CallActivityWriter.ts` - Writes CallActivity XML from metadata
- `ProcessWriter.ts` - Writes Process XML
- **NEVER MODIFIED** - All component-specific data comes from Registry

### Resource Framework

**Resource Interface** - Base for all attachments
- `GroovyResource` - Groovy scripts → `src/main/resources/script/`
- `XsdResource` - XML schemas → `src/main/resources/schema/`
- `MappingResource` - Message mappings → `src/main/resources/mapping/`

**IflowPackager.ts** - ZIP bundle creator
- Type-based routing to correct directories
- Handles inline content or filesystem paths
- Backward compatible (resources optional)

---

## 🚀 Build & Run Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run examples (generates .zip files)
npm run helloworld     # Content Modifier example
npm run groovy         # Groovy Script example
npm run router         # Router example
npm run datastore      # Data Store operations
npm run mapping        # Message Mapping example

# AI Frontend demo
npm run demo           # Starts AI integration server

# Development
npm run watch          # Watch mode for development
```

---

## 📋 Implementation Workflow (For Adding New Components)

### Step 1: Quick Check (< 2 minutes)
```bash
# Check if component already exists
grep "ComponentName" src/registry/ComponentRegistry.ts

# If found → Use existing metadata → Skip to Step 4

# Check if analysis exists
ls DISCOVERY_REPORT_*ComponentName*.md

# If found → Read confidence → Skip to Step 3
```

### Step 2: Discovery (Only if Step 1 fails)

Create `DISCOVERY_REPORT_ComponentName.md`:
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

### Step 3: Implementation (For ≥80% confidence)

1. **Create SDK Class** (30-60 min)
   - Pattern: Reuse existing component patterns
   - Evidence comments: `// Evidence: filename.iflw lines X-Y`

2. **Update Registry** (15 min)
   - Copy evidence-backed metadata
   - Document source: `// Evidence: ...`

3. **Create Example** (30 min)
   - Follow existing example patterns
   - Add to package.json scripts

### Step 4: SAP Validation Loop (REQUIRED for COMPLETE)

```bash
npm run build
npm run <component-name>    # Generates ZIP

# Import ZIP into SAP Integration Suite
# → Visual editor opens? (YES/NO)
# → Structural validation errors? (count)
# → Component configurable? (YES/NO)

# If any issues:
#   → Note what SAP shows
#   → Refine metadata based on SAP feedback
#   → Rebuild ZIP
#   → Re-import
#   → Repeat until zero errors

# ONLY WHEN:
#   ✅ ZIP imports with zero errors
#   ✅ Visual editor opens correctly
#   ✅ Component is fully configurable
#   → Mark as COMPLETE
```

### Step 5: Documentation

Create `V1.X_COMPONENT_NAME_COMPLETE.md`:
- What was implemented
- SAP validation results
- Example usage
- Known limitations
- Evidence sources

---

## 🧪 Testing & Validation

### Validation Levels

1. **TypeScript Compilation** - `npm run build` succeeds
2. **ZIP Generation** - Example scripts produce .iflw files
3. **SAP Import** - ZIP imports without errors
4. **Visual Editor** - Flow opens in graphical editor
5. **Configuration** - All properties are editable
6. **Deployment** - Flow can be deployed and executed

**COMPLETE status requires ALL 6 levels to pass.**

### Known Validation Results

✅ Content Modifier - All levels pass  
✅ Router - All levels pass  
✅ Groovy Script - All levels pass  
✅ Data Store - All levels pass  
✅ Message Mapping - All levels pass  
✅ HTTPS Sender - All levels pass  
✅ HTTP Receiver - All levels pass

---

## 🤖 AI Integration (Version 1.1+)

### AI Frontend Architecture

```
Natural Language Input
    ↓
LLM (GPT-4/Claude) with SDK knowledge
    ↓
TypeScript SDK Code Generation
    ↓
SDK Execution
    ↓
Integration Flow .zip
```

### AI Documentation

- **AI_DOCUMENTATION_INDEX.md** - Master index of all AI guides
- **AI_DEVELOPER_GUIDE.md** - How to use AI to generate flows
- **ai-prompting-guide.md** - Best practices for AI prompts
- **PROMPT_TEST_SUITE.md** - Test cases for AI generation

### Demo Application

```bash
npm run demo
# Opens web interface for natural language → Integration Flow
# Uses adesso AI Hub integration
```

See `AI_FRONTEND.md` for details.

---

## 📖 Critical Documents to Read

### For Understanding Architecture
1. **CLAUDE.md** - Engineering guidelines (READ FIRST)
2. **ARCHITECTURE.md** - Detailed architecture
3. **README.md** - User-facing overview

### For Implementation
4. **ComponentRegistry.ts** - SAP metadata (check FIRST before any component work)
5. **DISCOVERY_REPORT_*.md** - Component analysis cache
6. **V*_COMPLETE.md** - Validated implementations

### For AI Integration
7. **AI_DOCUMENTATION_INDEX.md** - AI integration master index
8. **AI_DEVELOPER_GUIDE.md** - AI usage guide

### For Troubleshooting
9. **BLOCKED_*.md** - Known blockers and resolutions
10. ***_FIX.md** - Root cause analyses and fixes

---

## 🎓 Key Learnings from Development

### Metadata Validation is Critical

**Problem**: Early implementations guessed SAP metadata  
**Result**: ZIPs generated but failed SAP import  
**Solution**: Always reverse-engineer from real SAP exports  
**Lesson**: 80% confidence → implement → SAP validates → refine (faster than analysis paralysis)

### Placeholder Pattern for Configurable Properties

**Problem**: Hardcoded adapter values (e.g., SFTP directory paths)  
**Result**: Components worked but weren't configurable in SAP editor  
**Solution**: Use `{{variable}}` placeholders for all user-facing properties  
**Lesson**: Adapter properties MUST use placeholders, BPMN properties can be literal  
**Evidence**: See `feedback_sftp_template_placeholders.md` in memory

### Resource Path Structure Matters

**Problem**: Incorrect resource paths (e.g., `script/` vs `src/main/resources/script/`)  
**Result**: ZIP structure invalid, SAP import failed  
**Solution**: Match exact SAP directory structure from reference exports  
**Lesson**: Always verify against real SAP .iflw extracts

### Writers Should Stay Generic

**Problem**: Adding component-specific logic to writers  
**Result**: Code duplication, maintenance nightmare  
**Solution**: All component specifics in Registry, writers query Registry  
**Lesson**: If tempted to modify writer → modify Registry instead

---

## 🔮 Roadmap & Next Steps

### Immediate Priorities

1. **Expand Component Library**
   - Splitter (General/Iterating)
   - Aggregator
   - SOAP adapters
   - XML/JSON converters
   - Filter

2. **Enhanced AI Integration**
   - Multi-step flow generation
   - Error handling patterns
   - Best practices enforcement

3. **Deployment API**
   - Auto-deploy to SAP Integration Suite
   - CI/CD integration

### Long-term Vision

- **Version 2.0**: Full adapter coverage + deployment automation
- **Version 3.0**: AI-native development (natural language to production flow)
- **Version 4.0**: Integration flow testing framework

See `ROADMAP.md` for detailed roadmap.

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T: Guess SAP Metadata
- Always extract from real SAP exports
- If metadata missing → STOP and document the gap
- Never invent cmdVariantUri, activityType, or componentVersion

### ❌ DON'T: Modify Writers for New Components
- Writers are generic BPMN serializers
- All component logic goes in Registry
- If writer needs changes, architecture is broken

### ❌ DON'T: Re-analyze Cached Components
- Check ComponentRegistry.ts FIRST
- Check DISCOVERY_REPORT_*.md SECOND
- Only search if both are empty

### ❌ DON'T: Skip SAP Validation
- COMPLETE ≠ "ZIP generated"
- COMPLETE = "SAP imports + zero errors + configurable"
- Always import and test in SAP Integration Suite

### ✅ DO: Follow Cache-First Strategy
1. Check Registry
2. Check Discovery Reports
3. Check Completion Reports
4. Only then search/analyze

### ✅ DO: Document Evidence
- Every metadata value needs `// Evidence: source.iflw lines X-Y`
- Every implementation needs completion report
- Every blocker needs BLOCKED_*.md document

### ✅ DO: Use Placeholders for Adapter Properties
- Adapter configs: `{{variableName}}` (configurable in SAP editor)
- BPMN properties: Can be literal values
- See SFTP template fix as example

---

## 🔗 External Resources

### SAP Integration Suite
- **Documentation**: https://help.sap.com/docs/integration-suite
- **Community**: https://community.sap.com/
- **API Reference**: https://api.sap.com/

### Project Resources
- **GitHub**: https://github.com/SahasranamanAdesso/cpi-ai_compiler
- **Issues**: Use GitHub issues for bug tracking
- **Discussions**: Use GitHub discussions for questions

---

## 📞 How to Resume Development

### On a New Machine

1. **Clone Repository**
   ```bash
   git clone https://github.com/SahasranamanAdesso/cpi-ai_compiler.git
   cd sap-integration-sdk
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Verify Setup**
   ```bash
   npm run build
   npm run helloworld
   # Should generate HelloWorld.zip
   ```

4. **Read Context**
   - Start with this file (PROJECT_CONTEXT_FOR_CLAUDE.md)
   - Read CLAUDE.md for engineering guidelines
   - Check ComponentRegistry.ts to see what exists
   - Review latest V*_COMPLETE.md for recent progress

5. **Check Current Status**
   ```bash
   git log --oneline -20        # Recent commits
   git tag                       # Version tags
   git branch -a                 # Available branches
   ```

### For Claude to Continue Work

**Provide Claude with**:
1. This file: `PROJECT_CONTEXT_FOR_CLAUDE.md`
2. Task description: What needs to be done
3. Context: Any specific requirements or constraints

**Claude should**:
1. Read this context file first
2. Check ComponentRegistry.ts for existing metadata
3. Check DISCOVERY_REPORT_*.md for component analysis
4. Follow implementation workflow from this document
5. Always validate with SAP Integration Suite

---

## 📝 Version History

- **v1.0** (2026-07-15) - Compiler Backend (Content Modifier only)
- **v1.1** (2026-07-20) - AI Frontend + adesso AI Hub integration
- **v1.2.0** (2026-07-23) - Metadata-driven architecture foundation
- **v1.2.1** (2026-07-24) - Groovy Script component
- **v1.2.2** (2026-07-25) - Router component
- **v1.2.3** (2026-07-26) - Router validation fixes
- **v1.3** (2026-08-04) - AI-First SDK complete, multiple components validated

See `CHANGELOG.md` for detailed version history.

---

## 🎯 Success Metrics

### Technical Success
- ✅ All generated ZIPs import successfully into SAP Integration Suite
- ✅ All components configurable in visual editor
- ✅ Zero hardcoded component logic in writers
- ✅ All metadata traceable to SAP exports

### Business Success
- ✅ 10x faster Integration Flow creation vs manual graphical editor
- ✅ AI can generate production-ready flows from natural language
- ✅ Developers can version-control integration logic
- ✅ Automated testing of integration flows

---

## 📄 License

MIT License - See LICENSE file in repository

---

## 🙏 Acknowledgments

- SAP Integration Suite team for the platform
- adesso India for project sponsorship
- TypeScript community for excellent tooling
- AI community for LLM integration patterns

---

## 🔄 Document Maintenance

**Last Updated**: 2026-08-13  
**Next Review**: When major version changes (v2.0+)  
**Update Triggers**:
- New major component implementation
- Architecture changes
- Critical bugs/fixes
- Deployment process changes

**Maintainer**: Update this file when significant project context changes

---

**END OF CONTEXT DOCUMENT**

---

# Quick Reference Card

## Most Common Commands
```bash
npm run build              # Build TypeScript
npm run helloworld         # Test Content Modifier
npm run router             # Test Router
npm run groovy             # Test Groovy Script
npm run demo               # Start AI frontend
```

## Most Important Files
1. `src/registry/ComponentRegistry.ts` - SAP metadata (check FIRST)
2. `CLAUDE.md` - Engineering guidelines
3. `ARCHITECTURE.md` - Architecture details
4. `examples/*.ts` - Working examples

## Most Important Principles
1. SAP Integration Suite is the specification
2. COMPLETE = SAP imports + zero errors + configurable
3. Registry contains SAP semantics, writers contain BPMN only
4. If evidence missing: STOP, Document, Don't guess
5. 80% confidence → implement → validate → refine

## Emergency Contacts
- GitHub Issues: https://github.com/SahasranamanAdesso/cpi-ai_compiler/issues
- Documentation: Start with CLAUDE.md
- Evidence: Check reference/sap-exports/ for real SAP files
