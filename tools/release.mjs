import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pad = (n) => String(n).padStart(2, '0');
const d = new Date();
const version = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

for (const [file, re] of [['sw.js', /const VERSION = '[^']*';/], ['js/version.js', /export const APP_VERSION = '[^']*';/]]) {
  const src = readFileSync(file, 'utf8');
  if (!re.test(src)) throw new Error(`Version introuvable dans ${file}`);
  writeFileSync(file, src.replace(re, (m) => m.replace(/'[^']*'/, `'${version}'`)));
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
run('git add -A');
run(`git commit -m "release ${version}"`);
run('git push');
console.log(`Déployé : ${version} (GitHub Pages met environ 1 minute à publier)`);
