const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
const credentialsSrc = path.join(__dirname, '..', 'credentials.json');
const nodeSrc = process.execPath;
const nodeDest = path.join(standaloneDir, process.platform === 'win32' ? 'node.exe' : 'node');

if (!fs.existsSync(standaloneDir)) {
  console.error('Run "next build" first. .next/standalone not found.');
  process.exit(1);
}

if (fs.existsSync(credentialsSrc)) {
  fs.copyFileSync(credentialsSrc, path.join(standaloneDir, 'credentials.json'));
  console.log('Copied credentials.json to standalone');
}

fs.copyFileSync(nodeSrc, nodeDest);
console.log('Copied Node runtime to standalone');
