// Run with: node tests/project.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { inspect, detectStack, isSecretFile } = require('../scripts/lib/project');

function tmp(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'shield-proj-'));
  for (const [f, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
    fs.writeFileSync(path.join(d, f), c);
  }
  return d;
}
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

eq(detectStack(tmp({ 'package.json': '{"dependencies":{"next":"15","react":"19"}}' })).id, 'nextjs');
eq(detectStack(tmp({ 'package.json': '{"dependencies":{"react":"19"},"devDependencies":{"vite":"7"}}' })).id, 'react');
eq(detectStack(tmp({ artisan: '', 'composer.json': '{"require":{"laravel/framework":"^12"}}' })).id, 'laravel');
eq(detectStack(tmp({ 'manage.py': '' })).id, 'django');
eq(detectStack(tmp({ 'requirements.txt': 'Django==5.2' })).id, 'django');
eq(detectStack(tmp({ 'requirements.txt': 'flask' })).id, 'python');
eq(detectStack(tmp({ 'wp-config.php': '' })).id, 'wordpress');
eq(detectStack(tmp({ 'pubspec.yaml': '' })).id, 'flutter');
eq(detectStack(tmp({ 'index.html': '' })).id, 'static');

eq(isSecretFile('.env'), true);
eq(isSecretFile('config/.env.production'), true);
eq(isSecretFile('.env.example'), false);
eq(isSecretFile('server.pem'), true);
eq(isSecretFile('src/env.js'), false);

const empty = inspect(tmp({ 'CLAUDE.md': '# x' }));
eq(empty.empty, true, 'only CLAUDE.md counts as empty');
eq(empty.checks.find((c) => c.id === 'tests').ok, false);

const laravelDefault = inspect(tmp({ artisan: '', 'composer.json': '{"require":{"laravel/framework":"^12"}}', 'phpunit.xml': '', 'tests/Feature/ExampleTest.php': '' }));
eq(laravelDefault.checks.find((c) => c.id === 'tests').ok, false, 'Laravel example tests do not count');
const laravelReal = inspect(tmp({ artisan: '', 'composer.json': '{"require":{"laravel/framework":"^12"}}', 'phpunit.xml': '', 'tests/Feature/HomePageTest.php': '' }));
eq(laravelReal.checks.find((c) => c.id === 'tests').ok, true);

const todo = inspect(tmp({ 'CLAUDE.md': '## Error monitoring\n- Error monitoring: TODO (baad mein)\n' }));
eq(todo.checks.find((c) => c.id === 'monitoring').ok, false, 'TODO monitoring is pending');
const sentry = inspect(tmp({ 'CLAUDE.md': '- Error monitoring: Sentry\n' }));
eq(sentry.checks.find((c) => c.id === 'monitoring').ok, true);

const npmDefault = inspect(tmp({ 'package.json': '{"scripts":{"test":"echo \\"Error: no test specified\\" && exit 1"}}' }));
eq(npmDefault.checks.find((c) => c.id === 'tests').ok, false, 'npm placeholder test script does not count');

console.log(`project: ${n} checks passed`);
