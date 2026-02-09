import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

let buildVersion = pkg.version;
const versionJsonPath = resolve(__dirname, 'public', 'version.json');
if (existsSync(versionJsonPath)) {
  try {
    const versionJson = JSON.parse(readFileSync(versionJsonPath, 'utf-8'));
    buildVersion = versionJson.version;
  } catch {
    console.warn('Could not read version.json, using package.json version');
  }
}

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    '__APP_VERSION__': JSON.stringify(buildVersion),
  }
});