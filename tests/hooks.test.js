// Runs the hook scripts the way Claude Code does: JSON on stdin, JSON on stdout.
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const run = (script, input, env = {}) => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', script)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.strictEqual(r.status, 0, `${script} must always exit 0`);
  return r.stdout ? JSON.parse(r.stdout) : null;
};
let n = 0;

// hooks.json uses exec form with node, so it works without bash on Windows.
const hooks = JSON.parse(fs.readFileSync(path.join(root, 'hooks', 'hooks.json'), 'utf8')).hooks;
for (const ev of Object.values(hooks)) for (const m of ev) for (const h of m.hooks) {
  assert.strictEqual(h.command, 'node');
  assert.ok(Array.isArray(h.args) && h.args[0].startsWith('${CLAUDE_PLUGIN_ROOT}/scripts/'));
  assert.ok(fs.existsSync(path.join(root, h.args[0].replace('${CLAUDE_PLUGIN_ROOT}/', ''))));
  n++;
}

const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'shield-hook-'));
let out = run('session-check.js', { cwd: empty }, { CLAUDE_PROJECT_DIR: empty });
assert.match(out.systemMessage, /brainam-shield:start/); n++;
assert.strictEqual(out.hookSpecificOutput.hookEventName, 'SessionStart'); n++;

fs.mkdirSync(path.join(empty, '.claude'));
fs.writeFileSync(path.join(empty, '.claude', 'shield.json'), '{"language":"english"}');
out = run('session-check.js', { cwd: empty }, { CLAUDE_PROJECT_DIR: empty });
assert.match(out.systemMessage, /new project/); n++;

fs.writeFileSync(path.join(empty, '.claude', 'shield.json'), '{"quiet":true}');
out = run('session-check.js', { cwd: empty }, { CLAUDE_PROJECT_DIR: empty });
assert.strictEqual(out, null, 'quiet mode prints nothing'); n++;

out = run('guard.js', { tool_name: 'Bash', tool_input: { command: 'git push --force' }, cwd: empty });
assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny'); n++;
out = run('guard.js', { tool_name: 'PowerShell', tool_input: { command: 'Remove-Item -Recurse -Force src' }, cwd: empty });
assert.strictEqual(out.hookSpecificOutput.permissionDecision, 'deny'); n++;
out = run('guard.js', { tool_name: 'Bash', tool_input: { command: 'npm test' }, cwd: empty });
assert.strictEqual(out, null); n++;
out = run('guard.js', { tool_name: 'Read', tool_input: { file_path: 'x' }, cwd: empty });
assert.strictEqual(out, null); n++;
// Broken input must never crash the session.
const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'guard.js')], { input: 'not json', encoding: 'utf8' });
assert.strictEqual(r.status, 0); n++;

console.log(`hooks: ${n} checks passed`);
fs.rmSync(empty, { recursive: true, force: true });
