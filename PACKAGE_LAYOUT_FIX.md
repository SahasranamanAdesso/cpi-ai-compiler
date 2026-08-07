# Package Layout Fix for GitHub Installation

## Problem

After GitHub installation, the package structure didn't match package.json:

**Expected (per package.json)**:
```
@cpi-ai/compiler/
  dist/index.js  ← main: "dist/index.js"
  package.json
  README.md
  LICENSE
```

**Actual**:
```
@cpi-ai/compiler/
  packages/compiler/dist/index.js
  package.json  ← main: "dist/index.js" (pointing to non-existent file)
```

This caused `require("@cpi-ai/compiler")` to fail with "Cannot find module".

## Root Cause

The repository is a monorepo with:
- Root: development environment with examples
- `packages/compiler/`: publishable compiler package

When installing from GitHub:
1. npm clones the entire repository
2. npm copies files per `files` array
3. npm runs `prepare` script
4. npm expects `main` field to point to correct location

The issue: compiler is built in `packages/compiler/dist/` but package.json points to `dist/`.

## Solution

### Strategy
Copy built files from `packages/compiler/dist/` to root `dist/` during prepare phase.

### Implementation

#### 1. Created `scripts/prepare-github.js`
Script that copies compiler build artifacts to root:
- `packages/compiler/dist/` → `dist/`
- `packages/compiler/README.md` → `README.md`
- `packages/compiler/LICENSE` → `LICENSE`

```javascript
// Runs during npm prepare lifecycle
// Copies dist, README, LICENSE to package root
// Idempotent - safe to run multiple times
```

#### 2. Updated `package.json`
```json
{
  "name": "@cpi-ai/compiler",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "packages/compiler",
    "scripts",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "prepare": "cd packages/compiler && npm install && npm run build && cd ../.. && node scripts/prepare-github.js"
  }
}
```

#### 3. Updated `.gitignore`
```gitignore
!scripts/**/*.js  # Allow scripts to be committed
```

### How It Works

**GitHub Install Flow**:
```
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
  ↓
1. Clone repository
  ↓
2. Copy files per files[] array:
   - packages/compiler/ (source)
   - scripts/ (prepare script)
  ↓
3. Run prepare script:
   a. cd packages/compiler
   b. npm install (compiler dependencies)
   c. npm run build (TypeScript → dist/)
   d. cd ../..
   e. node scripts/prepare-github.js (copy to root)
  ↓
4. Final structure in node_modules/@cpi-ai/compiler:
   dist/
   ├── index.js ← main points here
   ├── index.d.ts
   └── ...
   package.json
   README.md
   LICENSE
   packages/ (source, preserved)
   scripts/ (prepare script, preserved)
```

**Local Development** (unchanged):
```
cd packages/compiler
npm run build
  ↓
packages/compiler/dist/ populated
  ↓
Examples use: "@cpi-ai/compiler": "file:./packages/compiler"
```

## Verification

### Test Environment
- Clean CAP project
- ESM modules (`"type": "module"`)
- Node.js v24.16.0

### Installation
```bash
cd cap-mcp-service
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
```

### Results

✅ **Package Structure**:
```
node_modules/@cpi-ai/compiler/
  dist/
    index.js
    index.d.ts
    api/
    ir/
    mapper/
    model/
    ...
  package.json
  README.md
  LICENSE
  packages/  (source preserved)
  scripts/   (tools preserved)
```

✅ **Import Works**:
```javascript
import compiler from '@cpi-ai/compiler';
// OR
const compiler = require('@cpi-ai/compiler');
```

✅ **All Exports Accessible**:
- `compile`, `compileToZip`, `validate`
- `IFlow`, `Component`, `Connection`
- `HttpAdapter`, `Router`, `GroovyScript`, `DataStore`
- All model, mapper, registry exports

✅ **IFlow Instantiation**:
```javascript
const flow = new compiler.IFlow('MyFlow', 'Description');
// Works correctly
```

## Compatibility Matrix

| Scenario | Status | Notes |
|----------|--------|-------|
| GitHub install (CommonJS) | ✅ | `require("@cpi-ai/compiler")` |
| GitHub install (ESM) | ✅ | `import from "@cpi-ai/compiler"` |
| Local development | ✅ | Unchanged workflow |
| npm publish | ✅ | `packages/compiler/prepublishOnly` |
| Monorepo examples | ✅ | Use `file:./packages/compiler` |

## Key Files

### Modified
- **package.json**: Updated main/types/files/prepare
- **.gitignore**: Allow scripts/**/*.js
- **packages/compiler/package.json**: Has prepare script

### Added
- **scripts/prepare-github.js**: Copy script for GitHub installs

### Preserved
- All local development workflows
- Example scripts
- Monorepo structure
- npm publish capability

## Commits

1. `fdc6d39`: Add prepare script to compiler package
2. `8e3d073`: Configure root package for GitHub installation
3. `86f7990`: Correct package layout for GitHub installation (initial)
4. `e4c7583`: Include packages/compiler and scripts in files array
5. `a8efcbb`: Remove node_modules check from prepare script (FINAL FIX)

## Installation Command

```bash
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
```

## What Changed vs Previous Fix

**Previous attempt**: Changed paths in package.json but didn't copy files
- Problem: dist/ stayed in packages/compiler/
- Result: Module not found

**This fix**: Copy files to match package.json paths
- Solution: prepare script copies dist/ to root
- Result: Package structure matches package.json

## Verification Checklist

- [x] dist/index.js exists at package root
- [x] package.json main field points to dist/index.js
- [x] require("@cpi-ai/compiler") works
- [x] import from "@cpi-ai/compiler" works
- [x] All exports accessible
- [x] IFlow instantiation works
- [x] Local development unchanged
- [x] Source code preserved in packages/
- [x] README and LICENSE at root

✅ **Status**: Package layout fixed and verified in production CAP environment.
