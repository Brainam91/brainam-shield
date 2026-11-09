// Run with: node tests/guard.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { evaluate } = require('../scripts/guard');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shield-guard-'));
const sh = (c) => execSync(c, { cwd: dir, stdio: 'pipe' });
sh('git init -q -b main && git config user.email t@t && git config user.name t');
fs.writeFileSync(path.join(dir, 'app.js'), 'console.log(1)\n');
sh('git add app.js && git commit -qm init');

let pass = 0;
function check(cmd, expected, note) {
  const r = evaluate(cmd, dir, 'hinglish');
  const got = r ? r.decision : 'allow';
  assert.strictEqual(got, expected, `${note || cmd}: expected ${expected}, got ${got}`);
  pass++;
}

// rm -rf
check('rm -rf /', 'deny');
check('rm -rf src', 'deny');
check('rm -fr ~/projects', 'deny');
check('rm -r -f app', 'deny');
check('cd x && rm -rf .', 'deny');
check('rm -rf node_modules', 'allow');
check('rm -rf node_modules dist .next', 'allow');
check('rm -rf ./build/', 'allow');
check('rm -rf ../node_modules', 'deny');
check('rm app.js', 'allow');
check('Remove-Item -Recurse -Force C:\\Users\\x', 'deny');
check('rd /s /q src', 'deny');
check('echo "rm -rf /"', 'allow', 'quoted text is not a command');

// force push
check('git push --force', 'deny');
check('git push -f origin feature', 'deny');
check('git push origin +feature', 'deny');
check('git push --force-with-lease', 'deny');
check('git push origin --delete main', 'deny');

// push to main
check('git push', 'allow', 'no remote yet: nothing can go live');
sh('git remote add origin https://example.invalid/x.git');
check('git push', 'ask', 'on main, plain push');
check('git push -u origin main', 'ask');
check('git push origin feature', 'allow');
check('git push origin HEAD:main', 'ask');

// ship marker lets one push through
fs.writeFileSync(path.join(dir, '.git', 'shield-ship-ok'), 'x');
check('git push origin main', 'allow', 'after /ship');
check('git push origin main', 'ask', 'marker used up');

// secrets
fs.writeFileSync(path.join(dir, '.env'), 'DB_PASSWORD=hunter2\n');
check('git add .env', 'deny');
check('git add .', 'deny', 'broad add with .env not ignored');
check('git add -A && git commit -m "save"', 'deny');
fs.writeFileSync(path.join(dir, '.gitignore'), '.env\n');
check('git add .', 'allow', '.env now ignored');
check('git add -f .env', 'deny', 'forced add of ignored .env');
fs.writeFileSync(path.join(dir, '.env.example'), 'DB_PASSWORD=\n');
check('git add .env.example', 'allow');
fs.writeFileSync(path.join(dir, 'config.js'), 'const key = "sk_live_' + 'a'.repeat(24) + '";\n');
check('git add config.js', 'deny', 'live key in code');
check('git add .', 'deny', 'broad add picks up key');
fs.writeFileSync(path.join(dir, 'config.js'), 'const key = process.env.STRIPE_KEY;\n');
check('git add config.js', 'allow');
sh('git add config.js');
check('git commit -m "use env"', 'allow');
fs.writeFileSync(path.join(dir, 'app.js'), 'const t="ghp_' + 'b'.repeat(36) + '"\n');
check('git commit -am "oops"', 'deny', 'commit -a with token in tracked file');
check('git commit -m "only staged"', 'allow', 'token file not staged');

// work-losing commands
check('git reset --hard', 'ask');
check('git clean -fd', 'ask');
check('git checkout -- .', 'ask');
check('git status', 'allow');
check('npm test', 'allow');

console.log(`guard: ${pass} checks passed`);
fs.rmSync(dir, { recursive: true, force: true });
