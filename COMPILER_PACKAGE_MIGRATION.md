# Compiler Package Migration Guide

Date: 2026-08-06  
Version: 1.0.0  
Package: `@adesso/sap-integration-compiler`

## Overview

The SAP Integration Compiler has been refactored into a reusable npm package located at `packages/compiler/`. This allows other projects to use the compiler without pulling in demo/AI code.

## What Changed

### Package Structure

**Before:**
```
sap-integration-sdk/
├── src/                    # All source code mixed together
│   ├── ai/                 # AI generation code
│   ├── model/              # Core compiler models
│   ├── mapper/             # Core compiler mappers
│   ├── writer/             # Core compiler writers
│   └── ...
├── examples/               # Examples using src/ directly
├── demo/                   # AI demo server
└── package.json            # Single package
```

**After:**
```
sap-integration-sdk/
├── packages/
│   └── compiler/           # Reusable compiler package
│       ├── src/
│       │   ├── api/        # Public API (4 core functions)
│       │   ├── model/      # Core compiler models
│       │   ├── mapper/     # Core compiler mappers
│       │   ├── writer/     # Core compiler writers
│       │   └── index.ts    # Public exports
│       ├── dist/           # Built output
│       ├── package.json    # Compiler package
│       ├── tsconfig.json   # Compiler build config
│       └── README.md       # Compiler documentation
├── src/                    # Root source (AI code)
│   └── ai/                 # AI generation features
├── examples/               # Examples using @adesso/sap-integration-compiler
├── demo/                   # AI demo server
└── package.json            # Root package (uses compiler package)
```

### Public API

The compiler now exposes a **minimal 4-function API**:

```typescript
import {
    compileToZip,     // IFlow → ZIP buffer (primary function)
    compile,          // IFlow → BPMN XML buffer
    validate,         // IFlow → ValidationResult
    supportedComponents  // () → string[]
} from '@adesso/sap-integration-compiler';
```

All model classes are still exported for building flows:

```typescript
import {
    IFlow,
    HttpAdapter,
    Router,
    GroovyScript,
    // ... 30+ components
} from '@adesso/sap-integration-compiler';
```

### Code Removed from Compiler Package

The following code is **NOT** in the compiler package (kept in root only):

- ❌ `src/ai/` - AI generation features (AIPipeline, IntegrationFlowGenerator, etc.)
- ❌ `demo/` - AI demo server
- ✅ All core compiler functionality remains

## Migration Steps

### For Local Development (This Repository)

**No changes required!** Local development still works exactly as before:

```bash
# Install dependencies
npm install

# Build compiler package
cd packages/compiler
npm run build
cd ../..

# Run examples (use compiler package via file: reference)
npm run helloworld
npm run groovy
npm run consumer      # New consumer example
```

### For External Projects

To use the compiler in another project:

**Option 1: Install from local path**

```bash
npm install file:../path/to/sap-integration-sdk/packages/compiler
```

**Option 2: Install from git repository**

```bash
npm install git+https://github.com/SahasranamanAdesso/cpi-ai_compiler.git#main
```

**Option 3: Publish to npm (future)**

```bash
npm install @adesso/sap-integration-compiler
```

**Usage:**

```typescript
import { compileToZip, IFlow, HttpAdapter } from '@adesso/sap-integration-compiler';

const flow = new IFlow('MyFlow');
flow.setSender(HttpAdapter.sender({ address: '/api/test' }));
flow.setReceiver(HttpAdapter.receiver({ url: 'https://example.com' }));

const zipBuffer = await compileToZip(flow);
fs.writeFileSync('MyFlow.zip', zipBuffer);
```

## Build Commands

### Compiler Package

```bash
cd packages/compiler

# Install dependencies
npm install

# Build (output to dist/)
npm run build

# Clean
npm run clean
```

### Root Project

```bash
# Install all dependencies (includes compiler package)
npm install

# Run examples
npm run helloworld
npm run router
npm run consumer      # New example demonstrating package usage

# Run demo server (AI features)
npm run demo
```

## Package Details

### Compiler Package (`packages/compiler/package.json`)

```json
{
  "name": "@adesso/sap-integration-compiler",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "archiver": "^8.0.0",
    "xmlbuilder2": "^3.1.1"
  }
}
```

**Key Points:**
- ✅ Minimal dependencies (only core compiler needs)
- ✅ TypeScript declarations included (`dist/index.d.ts`)
- ✅ CommonJS module format (`module: "commonjs"`)
- ✅ Built output in `dist/`

### Root Package (`package.json`)

```json
{
  "name": "sap-integration-sdk",
  "dependencies": {
    "@adesso/sap-integration-compiler": "file:./packages/compiler",
    "express": "^4.18.2",
    "dotenv": "^16.6.1"
  }
}
```

**Key Points:**
- ✅ Uses compiler package via `file:` reference
- ✅ Examples work without modification
- ✅ Demo/AI code dependencies remain in root

## API Reference

### Primary API (4 Functions)

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `compileToZip` | `IFlow` | `Promise<Buffer>` | Compile flow to ZIP (main function) |
| `compile` | `IFlow` | `Promise<Buffer>` | Compile flow to BPMN XML only |
| `validate` | `IFlow` | `ValidationResult` | Validate flow before compilation |
| `supportedComponents` | - | `string[]` | List supported component types |

### Extended API

All model classes, IR classes, mappers, and registries are still exported for advanced use cases:

- **Models**: `IFlow`, `Component`, `Router`, `GroovyScript`, `HttpAdapter`, etc. (30+ classes)
- **IR**: `BpmnDefinitions`, `BpmnProcess`, `BpmnNode`, etc.
- **Mappers**: `BpmnProcessMapper`, `ComponentMapper`
- **Registry**: `ComponentRegistry`, `Registry`
- **Serialization**: `IflowSerializer`, `IflowPackager`

See `packages/compiler/README.md` for complete API documentation.

## Examples

### Before (Direct src/ imports)

```typescript
// ❌ Old way - importing from src/
import { IFlow } from '../src/model/IFlow';
import { HttpAdapter } from '../src/model/HttpAdapter';
import { IflowPackager } from '../src/packager/IflowPackager';
```

### After (Package imports)

```typescript
// ✅ New way - importing from package
import { IFlow, HttpAdapter, compileToZip } from '@adesso/sap-integration-compiler';
```

## Testing

All existing examples have been verified to work:

```bash
npm run helloworld        # ✓ Works
npm run groovy            # ✓ Works
npm run router            # ✓ Works
npm run datastore         # ✓ Works
npm run multicast         # ✓ Works
npm run consumer          # ✓ New example
```

**Verification Steps:**

1. ✅ Compiler package builds successfully (`npm run build`)
2. ✅ TypeScript declarations generated (`dist/index.d.ts`)
3. ✅ All examples run without errors
4. ✅ Generated ZIP files are valid
5. ✅ No functionality changed (compiler behavior identical)

## Benefits

### For Compiler Package Users

- ✅ **Minimal dependencies**: Only core compiler needs (archiver, xmlbuilder2)
- ✅ **Clean API**: 4 primary functions + model classes
- ✅ **TypeScript support**: Full type definitions
- ✅ **No AI bloat**: Compiler only, no AI generation code
- ✅ **Stable**: Core compiler logic unchanged

### For This Repository

- ✅ **Separation of concerns**: Compiler vs AI features
- ✅ **Easier testing**: Compiler package can be tested independently
- ✅ **Faster builds**: Compiler package builds faster (smaller surface area)
- ✅ **Reusability**: Compiler can be used by other projects
- ✅ **Local dev preserved**: Examples still work exactly as before

## Publishing to npm (Future)

When ready to publish:

```bash
cd packages/compiler

# Update version
npm version patch|minor|major

# Publish
npm publish --access public
```

Then external projects can install via:

```bash
npm install @adesso/sap-integration-compiler
```

## Rollback Plan

If needed, rollback is simple:

1. Remove `packages/compiler` directory
2. Restore `src/` from git history
3. Update `package.json` to remove compiler package reference
4. Run `npm install`

**Git commands:**

```bash
git checkout HEAD~1 -- src/
rm -rf packages/compiler
git checkout HEAD~1 -- package.json
npm install
```

## Support

- **Package documentation**: `packages/compiler/README.md`
- **API reference**: See TypeScript declarations in `dist/index.d.ts`
- **Examples**: `examples/consumer-example.ts`
- **Issues**: https://github.com/SahasranamanAdesso/cpi-ai_compiler/issues

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Structure | Monolithic `src/` | Separate `packages/compiler/` |
| Public API | All exports mixed | 4 core functions + models |
| Dependencies | All in root | Minimal in compiler package |
| Local dev | Examples use `src/` | Examples use package |
| External use | Clone entire repo | `npm install` compiler only |
| AI code | Mixed with compiler | Separate in root |
| Build | Single build | Package build + root build |

**Status:** ✅ Migration complete, all functionality preserved, local development unchanged.
