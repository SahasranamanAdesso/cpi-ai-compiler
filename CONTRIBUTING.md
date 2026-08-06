# Contributing to @cpi-ai/compiler

Thank you for your interest in contributing to the CPI AI Compiler! This document provides guidelines for contributing to the project.

---

## 🎯 Ways to Contribute

- 🐛 **Report bugs** - Found an issue? Open a GitHub issue
- 💡 **Suggest features** - Have an idea? Share it with us
- 📝 **Improve documentation** - Help others understand the project
- 🔧 **Submit code** - Fix bugs or implement features
- ✅ **Add tests** - Improve test coverage
- 🎨 **Add examples** - Show how to use the compiler

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- TypeScript knowledge

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/SahasranamanAdesso/cpi-ai_compiler.git
cd cpi-ai_compiler

# Install dependencies
npm install

# Build the compiler package
cd packages/compiler
npm run build

# Run examples to verify setup
cd ../..
npm run helloworld
```

---

## 📋 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add TypeScript types
- Comment complex logic

### 3. Test Your Changes

```bash
# Build the compiler
cd packages/compiler
npm run build

# Run existing examples
cd ../..
npm run helloworld
npm run order-demo

# Verify ZIPs can be imported into SAP Integration Suite
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add support for new component"
# or
git commit -m "fix: resolve router connection issue"
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:
- Clear description of changes
- Reference to related issues
- Screenshots (if UI changes)
- Test results

---

## 🏗️ Project Structure

```
sap-integration-sdk/
├── packages/
│   └── compiler/          # Main compiler package
│       ├── src/
│       │   ├── api/       # Public API functions
│       │   ├── model/     # Domain models (IFlow, Component, etc.)
│       │   ├── mapper/    # Model → BPMN IR transformation
│       │   ├── ir/        # BPMN Intermediate Representation
│       │   ├── writer/    # BPMN XML generation
│       │   ├── serializer/# .iflw file generation
│       │   ├── packager/  # ZIP packaging
│       │   └── registry/  # SAP component metadata
│       └── package.json
├── examples/              # Usage examples
├── docs/                  # Documentation
└── README.md
```

---

## 🎨 Code Style

### TypeScript Guidelines

```typescript
// ✅ Good
export class IFlow {
    private readonly components: Component[] = [];

    public addComponent(component: Component): IFlow {
        this.components.push(component);
        return this;
    }
}

// ❌ Avoid
export class IFlow {
    public components = [];
    
    addComponent(component) {
        this.components.push(component);
        return this;
    }
}
```

### Key Principles

1. **Use TypeScript types** - Avoid `any`
2. **Readonly when possible** - Prevent unintended mutations
3. **Return `this` for fluent APIs** - Enable method chaining
4. **Document public APIs** - JSDoc comments for exported functions
5. **Keep functions small** - Single responsibility principle

---

## 🧪 Testing Guidelines

### Manual Testing

Before submitting a PR:

1. **Build succeeds**
   ```bash
   npm run build
   ```

2. **Examples work**
   ```bash
   npm run helloworld
   npm run order-demo
   ```

3. **Generated ZIPs are valid**
   - Import into SAP Integration Suite
   - Open in graphical editor
   - Verify all components appear

### Adding New Components

When adding a new component type:

1. **Extract metadata from SAP**
   - Export a flow using the component
   - Document all BPMN properties
   - Add to ComponentRegistry

2. **Create model class**
   - Extend Component or create specialized class
   - Add user-friendly constructor
   - Export from index.ts

3. **Add example**
   - Create example file in `examples/`
   - Show typical usage
   - Add npm script to package.json

4. **Update documentation**
   - Add to README.md supported components
   - Document API in CONTRIBUTING.md

---

## 📝 Documentation

### Code Comments

```typescript
/**
 * Compiles an IFlow to a complete SAP Integration Flow ZIP package.
 *
 * @param flow - IFlow model instance
 * @returns ZIP file as Buffer
 *
 * @example
 * ```typescript
 * const flow = new IFlow("MyFlow");
 * const zipBuffer = await compileToZip(flow);
 * fs.writeFileSync("MyFlow.zip", zipBuffer);
 * ```
 */
export async function compileToZip(flow: IFlow): Promise<Buffer> {
    // ...
}
```

### README Updates

When adding features, update:
- Feature list
- Supported components
- Examples
- API reference

---

## 🐛 Bug Reports

Good bug reports include:

1. **Description** - What happened?
2. **Expected behavior** - What should happen?
3. **Reproduction steps** - How to reproduce?
4. **Code sample** - Minimal reproducible example
5. **Environment** - Node version, OS, package version
6. **Screenshots** - If applicable

### Issue Template

```markdown
**Description:**
Content Modifier component generates invalid BPMN

**Expected:**
Component should appear in SAP graphical editor

**Reproduction:**
\```typescript
const flow = new IFlow("Test");
const modifier = new Component("CM1", "Set Body", "Enricher", {
    body: "Hello"
});
flow.addComponent(modifier);
const zip = await compileToZip(flow);
\```

**Environment:**
- Node: 18.16.0
- Package: @cpi-ai/compiler@1.0.0
- OS: Windows 11
```

---

## 💡 Feature Requests

Feature requests should include:

1. **Use case** - Why is this needed?
2. **Proposed solution** - How should it work?
3. **Alternatives** - What else was considered?
4. **Impact** - Who benefits?

---

## 🔒 Security

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email: [your-email@example.com]
3. Include full details
4. Allow time for a fix before disclosure

---

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## ❓ Questions?

- Open a GitHub Discussion
- Check existing issues
- Read the documentation

---

**Thank you for contributing to @cpi-ai/compiler!** 🎉
