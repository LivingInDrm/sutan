const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'src/renderer/public/dice-box');
const targetRoot = path.join(projectRoot, 'public/dice-box');

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

copyDirectory(sourceRoot, targetRoot);
console.log(`synced dice-box assets to ${path.relative(projectRoot, targetRoot)}`);