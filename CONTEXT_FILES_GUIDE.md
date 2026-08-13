# Context Files Guide - Which File to Use

**Date**: 2026-08-13

This guide explains which documentation file to reference for different purposes.

---

## 📚 Documentation Files Overview

### For Claude on a NEW Machine

**Primary File**: `PROJECT_CONTEXT_FOR_CLAUDE.md`

**Purpose**: Complete project context for continuing development on a different machine

**Contents**:
- ✅ Full project vision and goals
- ✅ Current status and version history
- ✅ Complete architecture explanation
- ✅ File structure and key files
- ✅ Implementation workflow step-by-step
- ✅ Build and run commands
- ✅ Key learnings and common pitfalls
- ✅ How to resume development on new machine
- ✅ Quick reference card

**When to Use**: 
- Starting development on a new machine
- Onboarding new team members (human or AI)
- Need complete project overview
- Recovering context after long break

---

### For Claude ALREADY Working in Project

**Primary File**: `CLAUDE.md`

**Purpose**: Engineering guidelines and workflow for active development

**Contents**:
- ✅ Core principles (MUST FOLLOW)
- ✅ Knowledge base (where to find evidence)
- ✅ Cache-first strategy (avoid re-work)
- ✅ Implementation workflow (detailed steps)
- ✅ Validation criteria
- ✅ Evidence documentation rules
- ✅ Component completion checklist

**When to Use**:
- Active development (adding components)
- Need workflow guidance
- Need to understand "how to work"
- Engineering decisions and principles

**Key Difference from PROJECT_CONTEXT_FOR_CLAUDE.md**:
- CLAUDE.md = "How to work" (process, workflow, rules)
- PROJECT_CONTEXT_FOR_CLAUDE.md = "What is this" (context, architecture, knowledge)

---

### For Users/Developers Using the SDK

**Primary File**: `README.md`

**Purpose**: User-facing documentation for SDK usage

**Contents**:
- ✅ What the project is and why it exists
- ✅ Features and roadmap
- ✅ Installation instructions
- ✅ Quick start guide
- ✅ Example usage
- ✅ API reference

**When to Use**:
- First-time users learning about the SDK
- Want to know what features are available
- Need installation/setup instructions
- Looking for example code

---

### For Deep Architecture Understanding

**Primary File**: `ARCHITECTURE.md`

**Purpose**: Detailed technical architecture documentation

**Contents**:
- ✅ Architecture layers explained
- ✅ Data flow diagrams
- ✅ Design decisions and rationale
- ✅ Component interaction patterns
- ✅ Extension points

**When to Use**:
- Need deep understanding of "how it works"
- Debugging complex issues
- Planning major architectural changes
- Understanding design decisions

---

## 🎯 Decision Tree: Which File to Read?

```
Are you Claude starting work on a NEW machine?
  YES → Read PROJECT_CONTEXT_FOR_CLAUDE.md first
  NO ↓

Are you Claude already working in the project?
  YES → Follow CLAUDE.md guidelines
  NO ↓

Are you a human developer wanting to USE the SDK?
  YES → Read README.md
  NO ↓

Do you need deep architecture understanding?
  YES → Read ARCHITECTURE.md
  NO ↓

Do you need AI integration guidance?
  YES → Read AI_DOCUMENTATION_INDEX.md
```

---

## 📋 File Comparison Table

| File | Audience | Purpose | Size | Update Frequency |
|------|----------|---------|------|------------------|
| **PROJECT_CONTEXT_FOR_CLAUDE.md** | Claude (new machine) | Complete context for continuation | ~500 lines | Major versions |
| **CLAUDE.md** | Claude (active dev) | Engineering workflow | ~280 lines | Process changes |
| **README.md** | End users | SDK usage guide | ~200 lines | Feature releases |
| **ARCHITECTURE.md** | Technical deep-dive | Architecture details | ~300 lines | Architecture changes |
| **AI_DOCUMENTATION_INDEX.md** | AI integration | AI features guide | ~150 lines | AI feature updates |

---

## 🔄 For Claude: Recommended Reading Order

### Scenario 1: New Machine, Never Seen This Project
1. **PROJECT_CONTEXT_FOR_CLAUDE.md** (this file) - Get full context
2. **CLAUDE.md** - Learn the workflow
3. **ComponentRegistry.ts** - See what exists
4. **Latest V*_COMPLETE.md** - See recent work

### Scenario 2: Continuing Work in Same Session
1. **CLAUDE.md** - Follow workflow
2. **ComponentRegistry.ts** - Check existing metadata
3. **DISCOVERY_REPORT_*.md** - Check if component analyzed
4. **Reference SAP exports** - Extract metadata if needed

### Scenario 3: Been Away, Resuming After Break
1. **PROJECT_CONTEXT_FOR_CLAUDE.md** - Refresh context
2. **git log --oneline -20** - See what changed
3. **Latest V*_COMPLETE.md** - See recent completions
4. **CLAUDE.md** - Resume workflow

---

## 💡 Key Insights

### Why Two Files for Claude?

**PROJECT_CONTEXT_FOR_CLAUDE.md**:
- **Portable** - Can be shared across machines
- **Complete** - Everything needed to understand the project
- **Static** - Doesn't change often, represents stable knowledge
- **Onboarding** - Gets Claude "up to speed" fast

**CLAUDE.md**:
- **Process-focused** - How to do the work
- **Dynamic** - Updates as workflow improves
- **Actionable** - Step-by-step guidance
- **Efficiency** - Avoids re-work through cache-first strategy

**Analogy**:
- PROJECT_CONTEXT_FOR_CLAUDE.md = "Company handbook" (what is this place?)
- CLAUDE.md = "Standard operating procedures" (how do I do my job?)

### Complementary, Not Redundant

- **PROJECT_CONTEXT_FOR_CLAUDE.md** answers: WHAT, WHY, WHERE
- **CLAUDE.md** answers: HOW, WHEN, WHICH

Both are essential, neither is redundant.

---

## ✅ Verification Checklist

### For PROJECT_CONTEXT_FOR_CLAUDE.md Completeness

Does it contain:
- [x] Project vision and goals?
- [x] Current status and version?
- [x] Architecture overview?
- [x] File structure explanation?
- [x] Key files with descriptions?
- [x] Implementation workflow?
- [x] Build commands?
- [x] Testing approach?
- [x] Key learnings?
- [x] How to resume on new machine?
- [x] Quick reference?

### For CLAUDE.md Completeness

Does it contain:
- [x] Core principles?
- [x] Knowledge base locations?
- [x] Cache-first strategy?
- [x] Implementation steps?
- [x] Validation criteria?
- [x] Evidence documentation rules?
- [x] Confidence thresholds?
- [x] Completion checklist?

---

## 🎯 Best Practices

### When Updating These Files

**Update PROJECT_CONTEXT_FOR_CLAUDE.md when**:
- Major version released (v2.0, v3.0)
- Architecture changes
- New major component category added
- Critical learnings discovered
- Project goals shift

**Update CLAUDE.md when**:
- Workflow process improves
- New efficiency pattern discovered
- Validation criteria change
- Evidence requirements change
- New engineering principles established

**Update Both when**:
- Fundamental project changes (rare)
- Major paradigm shifts (e.g., metadata-driven architecture introduction)

### Avoid Duplication

- **Principle**: Don't duplicate facts across files
- **Strategy**: Cross-reference instead
  - Example in CLAUDE.md: "See PROJECT_CONTEXT_FOR_CLAUDE.md for architecture details"
  - Example in PROJECT_CONTEXT_FOR_CLAUDE.md: "See CLAUDE.md for implementation workflow"

---

## 📝 Summary

**For Claude on New Machine**:
→ Start with `PROJECT_CONTEXT_FOR_CLAUDE.md`

**For Claude in Active Development**:
→ Follow `CLAUDE.md`

**For Human SDK Users**:
→ Read `README.md`

**For Architecture Deep-Dive**:
→ Study `ARCHITECTURE.md`

**For AI Integration**:
→ Check `AI_DOCUMENTATION_INDEX.md`

---

**All files are complementary and serve different purposes. Use the right tool for the job.**

