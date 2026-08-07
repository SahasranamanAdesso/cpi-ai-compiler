# GitHub Package Installation Fix

## Problem
When installing the package from GitHub using:
```bash
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
```

The `node_modules/@cpi-ai/compiler` only contained:
- LICENSE
- README.md
- package.json

The `dist/` folder was missing, causing `require("@cpi-ai/compiler")` to fail.

## Root Cause
When installing from GitHub, npm:
1. Clones the repository
2. Runs `prepare` script (if present)
3. Copies files according to the `files` field in package.json

The issue was that:
- The repository is a monorepo with the compiler in `packages/compiler/`
- The root package.json pointed to `packages/compiler` as a local file dependency
- GitHub installs use the repository root, not subdirectories
- The `prepare` script was missing from the root package.json

## Solution

### Changes Made

#### 1. Updated Root `package.json` (commit: 8e3d073)
- Changed package name from `sap-integration-sdk` to `@cpi-ai/compiler`
- Updated `main` to point to `packages/compiler/dist/index.js`
- Updated `types` to point to `packages/compiler/dist/index.d.ts`
- Added `files` array to include only compiler dist:
  ```json
  "files": [
    "packages/compiler/dist",
    "packages/compiler/README.md",
    "packages/compiler/LICENSE"
  ]
  ```
- Added `prepare` script to build the compiler:
  ```json
  "prepare": "cd packages/compiler && npm install && npm run build"
  ```
- Moved compiler dependencies from `packages/compiler` to root
- Added `engines` field to specify Node.js >= 18.0.0

#### 2. Updated `packages/compiler/package.json` (commit: fdc6d39)
- Added `prepare` script:
  ```json
  "prepare": "npm run build"
  ```

### How It Works Now

1. **GitHub Install**: `npm install github:SahasranamanAdesso/cpi-ai-compiler#main`
2. **npm runs `prepare` script**:
   - Navigates to `packages/compiler`
   - Runs `npm install` to install compiler dependencies
   - Runs `npm run build` to compile TypeScript
3. **npm copies files** according to `files` array:
   - `packages/compiler/dist/*` → `node_modules/@cpi-ai/compiler/packages/compiler/dist/`
   - LICENSE and README
4. **Module resolution works** because `main` points to `packages/compiler/dist/index.js`

## Verification

### Test 1: Clean CommonJS Project
```bash
mkdir test-project
cd test-project
npm init -y
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
```

**Test file** (test.js):
```javascript
const compiler = require('@cpi-ai/compiler');
console.log('Success!', Object.keys(compiler));
```

**Result**: ✅ Works

### Test 2: CAP Project (ESM)
```bash
cd cap-mcp-service
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
```

**Test file** (test.js):
```javascript
import compiler from '@cpi-ai/compiler';
console.log('Success!', typeof compiler.compile);
```

**Result**: ✅ Works

## Compatibility

### ✅ GitHub Installation
```bash
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
```
Works correctly with automatic build on install.

### ✅ Local Development
```bash
cd packages/compiler
npm install
npm run build
```
Works correctly - monorepo structure maintained.

### ✅ Future npm Publish
The package is configured for both:
- **GitHub installs**: Uses root `prepare` script
- **npm publish**: Uses `packages/compiler/prepublishOnly` script

Both result in a valid `dist/` folder.

## Files Changed

1. **Root package.json**
   - Name: `@cpi-ai/compiler`
   - Main: `packages/compiler/dist/index.js`
   - Files: `["packages/compiler/dist", ...]`
   - Scripts: Added `prepare` and `build`
   - Dependencies: Moved from packages/compiler

2. **packages/compiler/package.json**
   - Scripts: Added `prepare: "npm run build"`

## Testing Checklist

- [x] Install from GitHub in clean directory
- [x] Verify `dist/` folder exists in `node_modules/@cpi-ai/compiler/packages/compiler/dist/`
- [x] Verify `require("@cpi-ai/compiler")` works (CommonJS)
- [x] Verify `import from "@cpi-ai/compiler"` works (ESM)
- [x] Verify all exports are accessible
- [x] Test in CAP project context
- [ ] Test npm publish compatibility (when ready to publish)

## Next Steps

When ready to publish to npm registry:
1. The existing `prepublishOnly` script in `packages/compiler/package.json` will handle the build
2. Publish from `packages/compiler/` directory:
   ```bash
   cd packages/compiler
   npm publish
   ```

The package is now fully compatible with both installation methods.

## Commits

- `fdc6d39`: fix: add prepare script for GitHub package installation
- `8e3d073`: fix: configure root package for GitHub installation

## Installation Command

```bash
npm install github:SahasranamanAdesso/cpi-ai-compiler#main
```

✅ **Status**: Verified working in CommonJS and ESM contexts.
