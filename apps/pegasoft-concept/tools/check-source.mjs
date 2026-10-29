import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const app = resolve(import.meta.dirname, '..');
let files = 0;
function check(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (item.name === 'public') continue;
    const path = resolve(directory, item.name);
    if (item.isDirectory()) check(path);
    else if (/\.[cm]?js$/.test(item.name)) {
      execFileSync(process.execPath, ['--check', path]);
      files++;
    }
  }
}
check(app);
console.log(JSON.stringify({ status: 'syntax_passed', files }));
