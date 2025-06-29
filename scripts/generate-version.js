// scripts/generate-version.js
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const versionFile = path.join(__dirname, '../src/version.js');
const content = `// Auto-generated at build time\nexport const APP_VERSION = \"${pkg.version}\";\n`;

fs.writeFileSync(versionFile, content);
console.log(`Generated src/version.js with version: ${pkg.version}`);
