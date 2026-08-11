# Resource Schema Investigation Report

## Problem Statement

CAP AI service is generating invalid resource schema, causing compiler to fail with:
```
Error: Unsupported resource type: undefined
```

**AI Generated:**
```json
"resources": ["groovy"]
```

**Compiler Expects:**
```json
"resources": [
  {
    "type": "groovy",
    "name": "transform.groovy",
    "content": "def Message processData(Message message) { return message; }"
  }
]
```

---

## 1. Exact Resource Schema ComponentFactory.fromJson() Expects

**Location:** `packages/compiler/src/factory/ComponentFactory.ts` lines 131-135

```typescript
export interface ResourceConfig {
    type: 'groovy' | 'mapping' | 'xsd' | 'xslt';
    name: string;
    content: string;
}
```

**In IFlowJson:**
```typescript
export interface IFlowJson {
    // ...
    resources?: ResourceConfig[];
    // ...
}
```

**Required fields:**
- `type`: Resource type discriminator
- `name`: Filename of the resource
- `content`: Actual file content (script code, mapping XML, schema, etc.)

---

## 2. Where Schema is Defined/Documented

### Interface Definition
**File:** `packages/compiler/src/factory/ComponentFactory.ts`
- **Lines 131-135:** ResourceConfig interface
- **Lines 630-653:** Resource processing implementation
- **Lines 544-592:** fromJson() documentation with complete example

### Public Export
**File:** `packages/compiler/src/index.ts`
- **Line 137:** `export type { ResourceConfig }`

### Documentation Example
**File:** `packages/compiler/src/factory/ComponentFactory.ts` lines 580-586

```typescript
resources: [
    {
        type: "groovy",
        name: "transform.groovy",
        content: "def Message processData(Message message) { ... }"
    }
]
```

---

## 3. What generateCompilerJson() Should Tell AI About Resources

**Current Problem:** AI is not being told the complete schema.

**Required AI Prompt Information:**
1. Resources are **objects**, not strings
2. Each resource must have:
   - `type`: One of "groovy", "mapping", "xsd", "xslt"
   - `name`: Filename (e.g., "transform.groovy")
   - `content`: Full file content as string
3. Component `scriptName`/`mappingName`/`xsd` must **reference** a resource by `name`
4. Resource content must be **provided inline** by the AI

---

## 4. Why AI Can Legally/Incorrectly Produce ["groovy"]

**Root Cause:** TypeScript interfaces are compile-time only.

At runtime, JavaScript accepts:
```javascript
fromJson({ resources: ["groovy"] })  // No TypeScript check
```

The error only occurs when the code tries to access `.type` property:
```typescript
for (const resDef of json.resources) {
    switch (resDef.type) {  // resDef = "groovy", so resDef.type = undefined
        case 'groovy': ...
        default:
            throw new Error(`Unsupported resource type: ${resDef.type}`);
    }
}
```

**Why AI produces this:**
- AI sees `scriptName: "transform.groovy"`
- AI infers resources might be a simple array of filenames
- AI lacks explicit schema documentation in the prompt
- No runtime validation before fromJson() is called

---

## 5. Is "resources": ["groovy"] Valid According to Intended Generic Compiler Schema?

**NO. Absolutely invalid.**

**Evidence:**
1. ✗ TypeScript interface requires `{ type, name, content }`
2. ✗ Implementation code accesses `.type`, `.name`, `.content` properties
3. ✗ Documentation example shows object format
4. ✗ Public export is `ResourceConfig` (object interface)
5. ✓ Test using valid schema succeeds
6. ✗ Test using string array fails with expected error

**The compiler schema is correct. The AI prompt is incomplete.**

---

## 6. GroovyScript scriptName vs Resource Relationship

### Component References Resource by Name

**Component:**
```json
{
  "type": "GroovyScript",
  "config": {
    "name": "Transform Order",
    "scriptName": "transform.groovy"  ← References resource by name
  }
}
```

**Resource:**
```json
{
  "type": "groovy",
  "name": "transform.groovy",  ← Must match scriptName
  "content": "def Message processData..."
}
```

### Same Pattern for All Resource-Backed Components

| Component | Reference Property | Resource Type |
|-----------|-------------------|---------------|
| GroovyScript | `scriptName` | `"groovy"` |
| MessageMapping | `mappingName` | `"mapping"` |
| XmlValidator | `xsd` | `"xsd"` |
| XsltMapping | `mappingName` | `"xslt"` |

---

## 7. Should AI Supply Resource Content or Should Platform Generate It?

**AI MUST Supply Content.**

**Evidence:**
- ResourceConfig interface requires `content: string`
- fromJson() passes content directly to resource constructors
- No platform code exists to generate/lookup content
- Resource packaging reads from Resource.getContent()

**Architecture:**
```
AI JSON (with content)
  └─> fromJson()
       └─> new GroovyResource(name, content)
            └─> Resource.getContent()
                 └─> IflowPackager writes to ZIP
```

**The platform does NOT:**
- Generate boilerplate scripts
- Look up content from a library
- Fetch content from external sources

**The AI IS responsible for:**
- Generating appropriate script/mapping content
- Providing complete, valid resource content inline

---

## 8. Existing Successful Example Comparison

### Test Example (WORKING)
**File:** `test/run-rt-003-tests.ts` lines 360-363

```typescript
resources: [
    {
        type: 'groovy' as const,
        name: 'transform.groovy',
        content: 'def Message processData(Message message) { return message; }'
    },
    {
        type: 'mapping' as const,
        name: 'OrderMapping.mmap',
        content: '<mapping/>'
    }
]
```

### AI Attempt (FAILING)
```json
"resources": ["groovy"]
```

### What's Different?

| Aspect | Working Example | AI Attempt |
|--------|----------------|------------|
| Format | Array of objects | Array of strings |
| `type` | ✓ Present | ✗ Missing |
| `name` | ✓ Present | ✗ Missing |
| `content` | ✓ Present | ✗ Missing |
| Matches schema | ✓ Yes | ✗ No |

---

## 9. Determine Root Cause Category

**Answer: A. AI Schema/Prompt Generation Problem**

### Analysis of Each Option:

**A. AI schema/prompt generation problem** ✓ **ROOT CAUSE**
- AI is not being told the complete ResourceConfig schema
- AI prompt lacks example showing `{ type, name, content }` format
- AI does not know it must provide content inline

**B. compiler schema problem** ✗ **NOT the issue**
- Schema is correct, well-documented, and type-safe
- Implementation matches documentation
- Existing tests prove schema works

**C. generateCompilerJson normalization problem** ✗ **NOT the issue**
- This is generateCompilerJson's job to communicate schema to AI
- But fixing it there means improving the prompt, not normalizing invalid input

**D. expected validation failure** ✗ **NOT applicable**
- Validation should happen, but AI shouldn't generate invalid input
- This is not a case where invalid input is expected

**E. architectural mismatch** ✗ **NOT the issue**
- Architecture is sound: AI provides content → compiler packages it
- No mismatch in responsibilities

---

## 10. Minimal Generic Fix Location (If Required)

### Option 1: Fix AI Prompt (RECOMMENDED)

**Location:** CAP AI service `generateCompilerJson()` prompt

**Change:** Add resource schema documentation to AI prompt:

```
Resources must be objects with this exact schema:
{
  "type": "groovy" | "mapping" | "xsd" | "xslt",
  "name": "filename.ext",
  "content": "full file content as string"
}

Example:
"resources": [
  {
    "type": "groovy",
    "name": "transform.groovy",
    "content": "def Message processData(Message message) {\n  return message\n}"
  }
]

For GroovyScript components:
- config.scriptName references the resource name
- You MUST provide the groovy resource with matching name
- You MUST generate appropriate Groovy script content
```

### Option 2: Add Runtime Validation (DEFENSIVE)

**Location:** `packages/compiler/src/factory/ComponentFactory.ts` before line 630

**Change:** Add schema validation with helpful error:

```typescript
// Validate resources schema
if (json.resources) {
    for (let i = 0; i < json.resources.length; i++) {
        const res = json.resources[i];
        if (typeof res === 'string') {
            throw new Error(
                `Invalid resource at index ${i}: Expected object with {type, name, content}, ` +
                `got string "${res}". Resources must be objects with type, name, and content fields.`
            );
        }
        if (!res.type || !res.name || !res.content) {
            throw new Error(
                `Invalid resource at index ${i}: Missing required fields. ` +
                `Expected {type, name, content}, got ${JSON.stringify(res)}`
            );
        }
    }
}
```

**This would provide clearer error messages but does NOT fix the root cause (bad AI prompt).**

### Option 3: Do Nothing (CURRENT STATE)

**Result:** Error message is already clear enough:
```
Unsupported resource type: undefined
```

AI developers can trace this to the schema mismatch.

---

## Regression Tests Required

If Option 2 (runtime validation) is implemented:

```typescript
test('Invalid resource: string instead of object', () => {
    const json = {
        name: 'Test',
        resources: ["groovy"]  // Invalid
    };
    expect(() => fromJson(json)).toThrow(/Expected object with {type, name, content}/);
});

test('Invalid resource: missing type field', () => {
    const json = {
        name: 'Test',
        resources: [{ name: "test.groovy", content: "..." }]  // Missing type
    };
    expect(() => fromJson(json)).toThrow(/Missing required fields/);
});

test('Invalid resource: missing content field', () => {
    const json = {
        name: 'Test',
        resources: [{ type: "groovy", name: "test.groovy" }]  // Missing content
    };
    expect(() => fromJson(json)).toThrow(/Missing required fields/);
});

test('Valid resource: all fields present', () => {
    const json = {
        name: 'Test',
        resources: [{
            type: "groovy",
            name: "test.groovy",
            content: "def Message processData(Message message) { return message; }"
        }]
    };
    expect(() => fromJson(json)).not.toThrow();
});
```

---

## Recommendations

### For CAP AI Service (PRIMARY FIX)

1. **Update AI Prompt** to include complete ResourceConfig schema
2. **Add Examples** showing resource objects with type/name/content
3. **Explain Relationship** between scriptName and resource name
4. **Require Content** generation for all resource-backed components

### For Compiler (OPTIONAL DEFENSIVE MEASURE)

1. **Add Runtime Validation** before line 630 in ComponentFactory.ts
2. **Improve Error Messages** to guide AI developers
3. **Consider JSON Schema** validation for IFlowJson

### For Documentation

1. **README** should prominently show resource schema
2. **TypeScript JSDoc** on ResourceConfig should include full example
3. **Public API Docs** should explain resource workflow

---

## Conclusion

**Root Cause:** AI prompt generation problem (Category A)

**The compiler is correct.** The AI is not being properly instructed about the resource schema.

**No compiler code changes are required.** The fix belongs in the CAP AI service prompt that tells the AI how to generate valid compiler JSON.

**The generic contract is well-defined** in ComponentFactory.ts and properly exported. The issue is entirely in how that contract is communicated to the AI.
