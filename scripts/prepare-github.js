// Prepare script for GitHub installation
// Copies packages/compiler/dist to root dist/ for correct package layout

const fs = require('fs');
const path = require('path');

// Only run if being installed from GitHub (not during local development)
// Check if we're in node_modules (GitHub install) or local repo
const isGithubInstall = __dirname.includes('node_modules');

if (!isGithubInstall) {
  console.log('📦 Skipping GitHub prepare (local development mode)');
  process.exit(0);
}

console.log('📦 Preparing package for GitHub installation...');

const rootDir = path.join(__dirname, '..');
const sourceDir = path.join(rootDir, 'packages', 'compiler');
const sourceDist = path.join(sourceDir, 'dist');
const targetDist = path.join(rootDir, 'dist');

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy dist folder
if (fs.existsSync(sourceDist)) {
  console.log('  Copying dist/ to root...');
  copyDir(sourceDist, targetDist);
} else {
  console.error('❌ Error: packages/compiler/dist not found. Build failed?');
  process.exit(1);
}

// Copy README and LICENSE if they exist
const filesToCopy = ['README.md', 'LICENSE'];
for (const file of filesToCopy) {
  const sourcePath = path.join(sourceDir, file);
  const targetPath = path.join(rootDir, file);

  if (fs.existsSync(sourcePath)) {
    console.log(`  Copying ${file} to root...`);
    fs.copyFileSync(sourcePath, targetPath);
  }
}

console.log('✅ Package prepared successfully for GitHub installation');
console.log('   Layout: dist/, package.json, README.md, LICENSE');
