# AI Frontend (Version 1.1)

**Natural Language → TypeScript SDK Code Generation**

Version 1.1 introduces an AI Frontend that generates TypeScript code using the SAP Integration SDK from natural language descriptions.

---

## Architecture

The AI Frontend is **completely independent** of the compiler (v1.0):

```
Natural Language Request
        ↓
   PromptBuilder
  (Build system prompt)
        ↓
    AIProvider
  (Send to LLM)
        ↓
   FlowValidator
  (Validate TypeScript)
        ↓
Generated TypeScript Code
  (using SAP Integration SDK)
        ↓
   [Compiler v1.0]
   (UNCHANGED)
        ↓
   HelloWorld.zip
```

---

## Key Principles

### ✅ What AI Does

- ✅ Generates **TypeScript code** using SAP Integration SDK
- ✅ Uses **only supported SDK classes** (IFlow, Component, Connection)
- ✅ Returns **executable TypeScript** (no markdown, no explanations)

### ❌ What AI Does NOT Do

- ❌ Generate XML
- ❌ Generate BPMN
- ❌ Generate ZIP files
- ❌ Invoke the compiler
- ❌ Deploy to SAP

**The AI's ONLY job is to write valid TypeScript. The compiler handles everything else.**

---

## Components

### 1. AIProvider Interface

```typescript
export interface AIProvider {
    generate(prompt: string): Promise<string>;
}
```

**Purpose:** Abstract AI provider implementations

**Implementations:**
- `ClaudeProvider` - Anthropic Claude API
- Future: OpenAI, Gemini, Ollama, etc.

**Responsibility:**
- Send prompt to LLM
- Return raw response

**Non-Responsibility:**
- Validation (FlowValidator handles this)
- Compilation (Compiler handles this)
- Prompt building (PromptBuilder handles this)

---

### 2. ClaudeProvider

```typescript
export class ClaudeProvider implements AIProvider {
    constructor(apiKey: string, model?: string)
    async generate(prompt: string): Promise<string>
}
```

**Purpose:** Claude API integration

**Configuration:**
- Model: `claude-3-5-sonnet-20241022` (default)
- Temperature: 0 (deterministic)
- Max tokens: 4096

**Environment:**
- Requires `ANTHROPIC_API_KEY` environment variable

---

### 3. PromptBuilder

```typescript
export class PromptBuilder {
    build(userRequest: string): string
}
```

**Purpose:** Construct system prompt for LLM

**Prompt includes:**
1. System instructions (generate ONLY TypeScript)
2. Supported components documentation
3. Examples of valid SDK usage
4. User's natural language request

**Critical instructions to LLM:**
- Generate ONLY TypeScript
- Use ONLY supported SDK classes
- Never generate XML/BPMN
- Never use Markdown code blocks
- Return executable code only

---

### 4. FlowValidator

```typescript
export class FlowValidator {
    validate(code: string): ValidationResult
}
```

**Purpose:** Lightweight validation of generated TypeScript

**Validation checks:**
- ✓ Code is not empty
- ✓ Contains exactly one IFlow
- ✓ Contains at least one Component
- ✓ Uses only supported SDK classes (IFlow, Component, Connection)
- ✓ Uses only supported component types (Enricher)
- ✓ Exports the flow
- ✓ No XML/BPMN generation
- ✓ No file/ZIP generation
- ✓ No Markdown code blocks

**Non-goals (keep v1.1 simple):**
- ❌ Advanced semantic validation
- ❌ TypeScript compilation
- ❌ Runtime execution
- ❌ Property validation

---

### 5. AIPipeline

```typescript
export class AIPipeline {
    constructor(provider: AIProvider, promptBuilder?: PromptBuilder, validator?: FlowValidator)
    async generate(userRequest: string): Promise<GenerationResult>
    async generateWithRetry(userRequest: string, maxRetries?: number): Promise<GenerationResult>
}
```

**Purpose:** Orchestrate AI workflow

**Workflow:**
1. Build prompt from user request
2. Send to AI provider
3. Validate generated TypeScript
4. Return result

**Features:**
- Dependency injection (pluggable providers/validators)
- Automatic retry with error feedback
- Provider-agnostic (works with any AIProvider)

**Non-Responsibility:**
- Does NOT compile code
- Does NOT generate ZIP
- Does NOT deploy to SAP

---

## Usage

### Basic Example

```typescript
import { AIPipeline } from './src/ai/AIPipeline';
import { ClaudeProvider } from './src/ai/providers/ClaudeProvider';

// 1. Create provider
const provider = new ClaudeProvider(process.env.ANTHROPIC_API_KEY!);

// 2. Create pipeline
const pipeline = new AIPipeline(provider);

// 3. Generate code
const result = await pipeline.generate(
    "Create a flow that receives HTTPS requests and sets the body to 'Hello World'"
);

// 4. Check result
if (result.success) {
    console.log('Generated TypeScript:');
    console.log(result.code);
    
    // Now pass to compiler (separate step)
    // ... compile with existing v1.0 compiler
} else {
    console.error('Errors:', result.errors);
}
```

### With Retry

```typescript
// Retry up to 3 times if validation fails
const result = await pipeline.generateWithRetry(
    "Create a multi-step flow",
    3
);
```

### Custom Provider

```typescript
class MyCustomProvider implements AIProvider {
    async generate(prompt: string): Promise<string> {
        // Your custom implementation
    }
}

const pipeline = new AIPipeline(new MyCustomProvider());
```

---

## Running the Demo

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your_api_key_here
```

### Run Demo

```bash
npm run ai-demo
```

**Demo shows:**
- Natural language → TypeScript generation
- Validation results
- Generated code examples

---

## Supported Components (Version 1.1)

The AI can ONLY use components supported by the v1.0 compiler:

### SDK Classes
- `IFlow` - Integration Flow container
- `Component` - Generic component
- `Connection` - Component connection (created via `flow.connect()`)

### Component Types
- `"Enricher"` - Content Modifier

**Properties for Enricher:**
- `bodyType`: "constant"
- `body`: string (message body content)

### Example Generated Code

```typescript
const flow = new IFlow("MyFlow");

const modifier = new Component("CallActivity_1", "Set Body", "Enricher");
modifier.properties.bodyType = "constant";
modifier.properties.body = "Hello from AI!";

flow.addComponent(modifier);

export default flow;
```

---

## Limitations (Version 1.1)

### Limited Component Library
- Only Content Modifier (Enricher) supported
- No Router, Groovy, Data Store, etc.
- These will be added in v1.2

### No Advanced Validation
- Basic syntax checks only
- No semantic validation
- No TypeScript compilation

### Single Provider
- Only Claude provider implemented
- OpenAI, Gemini, Ollama planned for future

### No Compilation Integration
- AI generates TypeScript only
- Compilation is a separate manual step
- Phase 2 will integrate these

---

## Design Principles

### Separation of Concerns
- **PromptBuilder** - Knows how to build prompts
- **AIProvider** - Knows how to call LLMs
- **FlowValidator** - Knows SDK structure
- **AIPipeline** - Orchestrates workflow

### Dependency Injection
```typescript
// Pluggable provider
const pipeline = new AIPipeline(new ClaudeProvider(apiKey));
const pipeline = new AIPipeline(new OpenAIProvider(apiKey));

// Pluggable validator
const pipeline = new AIPipeline(provider, undefined, new CustomValidator());
```

### Provider Agnostic
- Interface-based design
- Easy to add new providers
- No provider-specific code in pipeline

---

## Future Enhancements

### Version 1.1 Phase 2
- Integrate AI Frontend with Compiler v1.0
- Natural Language → TypeScript → ZIP (end-to-end)
- Example CLI tool

### Version 1.2
- Support for Router, Groovy, Data Store
- Advanced validation
- OpenAI provider
- Gemini provider

### Version 2.0
- Deployment integration
- Multi-turn conversation
- Context retention

---

## Testing

### Manual Testing
```bash
npm run ai-demo
```

### Unit Testing (Future)
```typescript
describe('FlowValidator', () => {
    it('should validate correct code', () => {
        const validator = new FlowValidator();
        const result = validator.validate(validCode);
        expect(result.isValid).toBe(true);
    });
});
```

---

## Troubleshooting

### API Key Issues
```
Error: Claude API key is required
```
**Solution:** Set `ANTHROPIC_API_KEY` in `.env`

### Validation Errors
```
Code must contain exactly one "new IFlow(...)"
```
**Solution:** AI generated invalid code. Use `generateWithRetry()` to retry with error feedback.

### Unknown Component Types
```
Unknown component types: Router
```
**Solution:** Router is not supported in v1.0. Only use Enricher (Content Modifier).

---

## Architecture Comparison

### Version 1.0 (Compiler Only)
```
TypeScript Code (manual) → Compiler → HelloWorld.zip
```

### Version 1.1 (AI Frontend)
```
Natural Language → AI Frontend → TypeScript Code
                                      ↓
                              [Manual Step]
                                      ↓
                              Compiler (v1.0 unchanged)
                                      ↓
                              HelloWorld.zip
```

### Version 1.1 Phase 2 (Planned)
```
Natural Language → AI Frontend → TypeScript → Compiler → HelloWorld.zip
                  (automated end-to-end)
```

---

**The compiler (v1.0) remains completely unchanged. The AI Frontend is a separate, independent layer.**
