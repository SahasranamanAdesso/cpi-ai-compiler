// Prepare script for GitHub installation
// Copies packages/compiler/dist to root dist/ for correct package layout

const fs = require('fs');
const path = require('path');

console.log('📦 Preparing package layout...');

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

console.log('✅ Package layout prepared');
console.log('   Root structure: dist/, package.json, README.md, LICENSE');
