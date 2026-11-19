import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ui = fs.readFileSync(path.join(ROOT, 'src/admin-ui.js'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'src/worker.js'), 'utf8');

const match = ui.match(/export const ADMIN_HTML = `([\s\S]*)`;\s*$/);
if (!match) throw new Error('ADMIN_HTML template not found');

// The admin HTML is inserted into a template literal, so escape backticks and ${.
const admin = match[1].replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const out = worker
  .replace(/^import \{ ADMIN_HTML \} from '\.\/admin-ui\.js';\s*$/m, '')
  .replace('const DRAFT_KEY', `const ADMIN_HTML = \`${admin}\`;\n\nconst DRAFT_KEY`);

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const target = path.join(ROOT, 'dist/worker.js');
fs.writeFileSync(target, out);
console.log(`wrote ${target} (${out.length} bytes)`);
