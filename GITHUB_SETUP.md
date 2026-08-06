# GitHub Repository Setup Guide

This guide walks you through setting up the @cpi-ai/compiler repository on GitHub and publishing to npm.

---

## 📋 Prerequisites

- GitHub account
- npm account (create at https://www.npmjs.com)
- Git installed locally
- Repository already initialized locally

---

## 🚀 Step 1: Create GitHub Repository

### Option A: Via GitHub Web Interface

1. Go to https://github.com/new
2. **Repository name**: `cpi-ai-compiler`
3. **Description**: "AI-powered TypeScript compiler for SAP Cloud Integration (CPI) Integration Flows"
4. **Visibility**: Public
5. **DO NOT** initialize with README, LICENSE, or .gitignore (we already have them)
6. Click "Create repository"

### Option B: Via GitHub CLI

```bash
gh repo create cpi-ai-compiler --public --description "AI-powered TypeScript compiler for SAP Cloud Integration"
```

---

## 🔗 Step 2: Connect Local Repository to GitHub

```bash
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk

# Add GitHub remote (if not already added)
git remote add origin https://github.com/YOUR_USERNAME/cpi-ai-compiler.git

# Or update existing remote
git remote set-url origin https://github.com/YOUR_USERNAME/cpi-ai-compiler.git

# Verify remote
git remote -v
```

---

## 📦 Step 3: Prepare for First Commit

### Review Files to Commit

```bash
git status
```

### Add Important Files

```bash
# Core package
git add packages/compiler/

# Documentation
git add README.md LICENSE CONTRIBUTING.md CHANGELOG.md

# Configuration
git add package.json tsconfig.json .gitignore

# Examples (optional - they use internal imports currently)
git add examples/
```

### Files to EXCLUDE (already in .gitignore)

- ❌ `node_modules/`
- ❌ `dist/`
- ❌ `*.zip` files
- ❌ `.env` files
- ❌ Temporary directories (`temp/`, `output/`)

---

## 📝 Step 4: Commit and Push

```bash
# Initial commit
git add .
git commit -m "Initial commit: @cpi-ai/compiler v1.0.0

- TypeScript compiler for SAP CPI Integration Flows
- Complete BPMN 2.0 + SAP extensions support
- 40+ supported components
- Full resource embedding (Groovy, XSLT, XSD)
- AI-ready API for flow generation"

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 🏷️ Step 5: Create GitHub Release

### Create Git Tag

```bash
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk
git tag -a v1.0.0 -m "Release v1.0.0: Initial public release"
git push origin v1.0.0
```

### Create GitHub Release

1. Go to https://github.com/YOUR_USERNAME/cpi-ai-compiler/releases/new
2. **Tag**: `v1.0.0`
3. **Release title**: `v1.0.0 - Initial Release`
4. **Description**:

```markdown
# @cpi-ai/compiler v1.0.0

First public release of the AI-powered TypeScript compiler for SAP Cloud Integration.

## 🎉 Features

- ✅ TypeScript SDK for building SAP CPI Integration Flows
- ✅ Complete BPMN 2.0 + SAP extensions support
- ✅ 40+ supported components (adapters, transformations, routing, etc.)
- ✅ Resource embedding (Groovy scripts, XSLT, XSD schemas)
- ✅ Full validation before compilation
- ✅ SAP Integration Suite compatible ZIPs
- ✅ AI-ready API for LLM-powered flow generation

## 📦 Installation

\```bash
npm install @cpi-ai/compiler
\```

## 📚 Documentation

- [README](https://github.com/YOUR_USERNAME/cpi-ai-compiler#readme)
- [API Reference](https://github.com/YOUR_USERNAME/cpi-ai-compiler/tree/main/packages/compiler)
- [Examples](https://github.com/YOUR_USERNAME/cpi-ai-compiler/tree/main/examples)
- [Contributing Guide](https://github.com/YOUR_USERNAME/cpi-ai-compiler/blob/main/CONTRIBUTING.md)

## 🔗 Links

- npm: https://www.npmjs.com/package/@cpi-ai/compiler
- GitHub: https://github.com/YOUR_USERNAME/cpi-ai-compiler
```

5. Check "Set as the latest release"
6. Click "Publish release"

---

## 📦 Step 6: Publish to npm

### One-Time npm Setup

```bash
# Login to npm
npm login

# Create @cpi-ai organization (first time only)
# Go to https://www.npmjs.com
# Click "Add Organization" → Name: "cpi-ai" → Type: Personal (free)
```

### Publish Package

```bash
cd C:\Sahas\adesso\CPI_AI\sap-integration-sdk\packages\compiler

# Verify package contents
npm pack --dry-run

# Test local installation
npm install -g

# Publish to npm (public)
npm publish --access public
```

**Note**: Scoped packages (`@cpi-ai/compiler`) are private by default. Use `--access public` to make them public.

---

## ✅ Step 7: Verify Publication

### Check npm

```bash
# View package on npm
npm view @cpi-ai/compiler

# Install in a test project
mkdir test-install
cd test-install
npm init -y
npm install @cpi-ai/compiler

# Test import
node -e "const compiler = require('@cpi-ai/compiler'); console.log(Object.keys(compiler));"
```

### Check GitHub

1. Repository appears at https://github.com/YOUR_USERNAME/cpi-ai-compiler
2. README renders correctly
3. License badge shows MIT
4. Release v1.0.0 is published

---

## 🎨 Step 8: Add Repository Badges (Optional)

Add to top of README.md:

```markdown
[![npm version](https://img.shields.io/npm/v/@cpi-ai/compiler.svg)](https://www.npmjs.com/package/@cpi-ai/compiler)
[![npm downloads](https://img.shields.io/npm/dm/@cpi-ai/compiler.svg)](https://www.npmjs.com/package/@cpi-ai/compiler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/cpi-ai-compiler.svg)](https://github.com/YOUR_USERNAME/cpi-ai-compiler/stargazers)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
```

---

## 📋 Step 9: Configure Repository Settings

### Topics (for discoverability)

Add these topics to your repository:

- `sap`
- `integration`
- `typescript`
- `compiler`
- `bpmn`
- `cpi`
- `sap-integration-suite`
- `cloud-integration`
- `ai`
- `code-generation`

### About Section

- **Description**: "AI-powered TypeScript compiler for SAP Cloud Integration (CPI) Integration Flows"
- **Website**: `https://www.npmjs.com/package/@cpi-ai/compiler`
- **Topics**: (added above)

---

## 🔄 Step 10: Future Updates

### Update Version

```bash
cd packages/compiler

# Patch release (1.0.0 → 1.0.1)
npm version patch

# Minor release (1.0.0 → 1.1.0)
npm version minor

# Major release (1.0.0 → 2.0.0)
npm version major
```

### Publish Update

```bash
npm run build
npm publish
git push
git push --tags
```

### Create GitHub Release

1. Go to Releases
2. Draft new release
3. Select new tag
4. Describe changes
5. Publish

---

## 📊 Package Statistics

After publishing, track:

- npm downloads: https://www.npmjs.com/package/@cpi-ai/compiler
- GitHub stars: https://github.com/YOUR_USERNAME/cpi-ai-compiler
- Issues: https://github.com/YOUR_USERNAME/cpi-ai-compiler/issues

---

## 🆘 Troubleshooting

### "Package name taken"

If `@cpi-ai/compiler` is already taken:
- Try `@YOUR_USERNAME/cpi-compiler`
- Or request transfer from current owner

### "Not authorized"

```bash
npm logout
npm login
# Enter credentials
npm whoami  # Verify login
```

### "Organization not found"

Create organization first:
- Go to https://www.npmjs.com
- Click "Add Organization"
- Name: `cpi-ai`

### "Git push rejected"

```bash
git pull --rebase origin main
git push origin main
```

---

## ✅ Checklist

Before publishing:

- [ ] README.md updated
- [ ] LICENSE file present
- [ ] CHANGELOG.md updated
- [ ] package.json metadata complete
- [ ] All examples tested
- [ ] `npm run build` succeeds
- [ ] `npm pack --dry-run` shows correct files
- [ ] Version number is correct
- [ ] Git repository clean (no uncommitted changes)

After publishing:

- [ ] Package appears on npm
- [ ] GitHub repository is public
- [ ] Release is tagged
- [ ] README badges work
- [ ] Installation works: `npm install @cpi-ai/compiler`
- [ ] Examples can import from package

---

**Congratulations! Your package is now live! 🎉**
