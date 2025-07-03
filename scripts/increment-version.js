// scripts/increment-version.js
const fs = require('fs');
const path = require('path');

// Read the package.json file
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = require(packageJsonPath);

// Parse current version
const versionParts = packageJson.version.split('.');
const [major, minor, patch] = versionParts.map(Number);

// Increment the patch version
const newVersion = `${major}.${minor}.${patch + 1}`;
packageJson.version = newVersion;

// Write back to package.json
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(packageJson, null, 2) + '\n'
);

console.log(`Version incremented from ${major}.${minor}.${patch} to ${newVersion}`);
