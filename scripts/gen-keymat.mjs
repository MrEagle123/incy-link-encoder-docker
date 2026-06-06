#!/usr/bin/env node
// Regenerate src/keymat.ts from assets/*.bin.
//
// Run this whenever the keymat asset bytes change — for example,
// when rotating to a new scheme (`crypt2/...`). The published NPM
// package embeds these bytes as base64 inside dist/, so a stale
// keymat.ts means the package decrypts no longer matches what the
// iOS/Android/Desktop clients expect.
//
// Usage:
//   npm run gen-keymat
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const a = readFileSync(resolve(root, 'assets/incy_assets_a.bin')).toString('base64');
const b = readFileSync(resolve(root, 'assets/incy_assets_b.bin')).toString('base64');

const out = `// Auto-generated from assets/*.bin. Run \`npm run gen-keymat\` to refresh.
// shellcheck disable=all
export const KEYMAT_A_B64 = '${a}';
export const KEYMAT_B_B64 = '${b}';
`;

writeFileSync(resolve(root, 'src/keymat.ts'), out);
console.log(`wrote src/keymat.ts (${a.length} + ${b.length} bytes base64)`);
