import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, 'package.json');
const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const timestamp = new Date().toISOString();
const buildVersion = `${pkg.version}-${timestamp.slice(0, 10).replace(/-/g, '')}`;

const versionInfo = {
  version: buildVersion,
  timestamp: timestamp
};

const publicPath = join(__dirname, 'public', 'version.json');
writeFileSync(publicPath, JSON.stringify(versionInfo, null, 2));

console.log(`Generated version.json: v${buildVersion}`);
