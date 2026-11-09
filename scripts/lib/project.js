// Shared helpers: look at a project folder and work out its stack and safety status.
// Plain Node.js only (no packages), so it runs the same on macOS, Windows and Linux.
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Files that hold secrets and must never be committed.
const ENV_SAFE_SUFFIXES = ['.example', '.sample', '.template', '.dist', '.defaults'];

function isSecretFile(file) {
  const base = path.basename(file).toLowerCase();
  if (base === '.env' || base.startsWith('.env.')) {
    return !ENV_SAFE_SUFFIXES.some((s) => base.endsWith(s));
  }
  if (/\.(pem|p12|pfx|key|keystore|jks)$/.test(base)) return true;
  if (/^id_(rsa|dsa|ecdsa|ed25519)$/.test(base)) return true;
  if (base === 'credentials.json' || base === 'service-account.json') return true;
  if (/^service-account.*\.json$/.test(base)) return true;
  if (base === 'google-services.json' || base === 'key.properties') return true;
  return false;
}

// Patterns of well-known secret keys. We only ever report the file name, never the value.
const SECRET_PATTERNS = [
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Stripe live key', re: /\b(sk|rk)_live_[0-9a-zA-Z]{16,}/ },
  { name: 'OpenAI / Anthropic style key', re: /\bsk-(ant-|proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'GitHub token', re: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/ },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}/ },
  { name: 'Private key', re: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'Razorpay live key', re: /\brzp_live_[A-Za-z0-9]{10,}/ },
];

function findSecretInText(text) {
  for (const p of SECRET_PATTERNS) {
    if (p.re.test(text)) return p.name;
  }
  return null;
}

function scanFileForSecret(absPath) {
  try {
    const st = fs.statSync(absPath);
    if (!st.isFile() || st.size > 1024 * 1024) return null;
    const buf = fs.readFileSync(absPath);
    if (buf.includes(0)) return null; // binary file
    return findSecretInText(buf.toString('utf8'));
  } catch {
    return null;
  }
}

function git(cwd, args) {
  try {
    const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 5000, windowsHide: true });
    if (r.error || r.status !== 0) return null;
    return r.stdout;
  } catch {
    return null;
  }
}

function exists(dir, ...parts) {
  try {
    return fs.existsSync(path.join(dir, ...parts));
  } catch {
    return false;
  }
}

function readText(dir, ...parts) {
  try {
    return fs.readFileSync(path.join(dir, ...parts), 'utf8');
  } catch {
    return '';
  }
}

function readJson(dir, ...parts) {
  try {
    return JSON.parse(readText(dir, ...parts));
  } catch {
    return null;
  }
}

function listDir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

// Things that do not count as "the student has started a project".
const IGNORABLE = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini', '.git', '.claude', '.idea', '.vscode', 'CLAUDE.md', '.gitignore', 'README.md']);

function isEmptyProject(dir) {
  return listDir(dir).every((f) => IGNORABLE.has(f));
}

function detectStack(dir) {
  const pkg = readJson(dir, 'package.json');
  const deps = pkg ? { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) } : {};
  const composer = readJson(dir, 'composer.json');
  const composerDeps = composer ? { ...(composer.require || {}), ...(composer['require-dev'] || {}) } : {};

  if (exists(dir, 'wp-config.php') || exists(dir, 'wp-content') || exists(dir, 'wp-config-sample.php')) {
    return { id: 'wordpress', label: 'WordPress' };
  }
  if (exists(dir, 'artisan') && composer && composerDeps['laravel/framework']) {
    return { id: 'laravel', label: 'Laravel (PHP)' };
  }
  if (exists(dir, 'pubspec.yaml')) return { id: 'flutter', label: 'Flutter' };
  if (exists(dir, 'build.gradle') || exists(dir, 'build.gradle.kts') || exists(dir, 'settings.gradle') || exists(dir, 'settings.gradle.kts')) {
    return { id: 'android', label: 'Android' };
  }
  if (exists(dir, 'manage.py')) return { id: 'django', label: 'Django (Python)' };
  if (pkg) {
    if (deps.next) return { id: 'nextjs', label: 'Next.js' };
    if (deps.react) return { id: 'react', label: deps.vite ? 'React (Vite)' : 'React' };
    if (deps.vue || deps.nuxt) return { id: 'node', label: 'Vue / Node.js' };
    return { id: 'node', label: 'Node.js' };
  }
  if (exists(dir, 'pyproject.toml') || exists(dir, 'requirements.txt') || exists(dir, 'Pipfile')) {
    const reqs = readText(dir, 'requirements.txt') + readText(dir, 'pyproject.toml') + readText(dir, 'Pipfile');
    if (/django/i.test(reqs)) return { id: 'django', label: 'Django (Python)' };
    return { id: 'python', label: 'Python' };
  }
  if (composer) return { id: 'php', label: 'PHP' };
  if (exists(dir, 'index.html')) return { id: 'static', label: 'Static website (HTML)' };
  return { id: 'unknown', label: 'Unknown' };
}

function walk(dir, depth, onFile) {
  if (depth < 0) return;
  for (const name of listDir(dir)) {
    if (['node_modules', 'vendor', '.git', '.next', 'dist', 'build', '.venv', 'venv', '__pycache__', 'storage'].includes(name)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, depth - 1, onFile);
    else if (onFile(name, full) === true) return true;
  }
  return false;
}

function hasTests(dir, stack) {
  const pkg = readJson(dir, 'package.json');
  const testScript = pkg && pkg.scripts && pkg.scripts.test;
  if (testScript && !/no test specified/i.test(testScript)) return true;
  if (stack.id === 'laravel' || stack.id === 'php') {
    if (!exists(dir, 'phpunit.xml') && !exists(dir, 'phpunit.xml.dist')) return false;
    // Laravel ships example tests; count them only if more than the two defaults exist.
    let count = 0;
    walk(path.join(dir, 'tests'), 4, (name) => {
      if (/Test\.php$/.test(name) && name !== 'ExampleTest.php') count++;
    });
    return count > 0;
  }
  if (stack.id === 'django' || stack.id === 'python') {
    let found = false;
    walk(dir, 4, (name) => {
      if (/^test_.*\.py$|_test\.py$/.test(name)) {
        found = true;
        return true;
      }
      return false;
    });
    if (found) return true;
    // Django creates an empty tests.py per app; it counts only once it has a test in it.
    let real = false;
    walk(dir, 3, (name, full) => {
      if (name === 'tests.py' && /def test/.test(fs.readFileSync(full, 'utf8'))) {
        real = true;
        return true;
      }
      return false;
    });
    return real;
  }
  let found = false;
  walk(dir, 5, (name) => {
    if (/\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/.test(name) || /_test\.dart$/.test(name)) {
      found = true;
      return true;
    }
    return false;
  });
  return found;
}

function hasCI(dir) {
  return listDir(path.join(dir, '.github', 'workflows')).some((f) => /\.ya?ml$/.test(f));
}

function claudeMd(dir) {
  return readText(dir, 'CLAUDE.md') || readText(dir, '.claude', 'CLAUDE.md');
}

function hasMonitoring(dir) {
  const pkg = readText(dir, 'package.json');
  const composer = readText(dir, 'composer.json');
  const py = readText(dir, 'requirements.txt') + readText(dir, 'pyproject.toml');
  const envEx = readText(dir, '.env.example');
  if (/@sentry\/|logrocket|bugsnag|rollbar|posthog|highlight\.run/i.test(pkg)) return true;
  if (/sentry\/sentry|bugsnag|rollbar|flare/i.test(composer)) return true;
  if (/sentry-sdk|sentry_sdk|rollbar|bugsnag/i.test(py)) return true;
  if (/SENTRY_DSN|LOGROCKET|BUGSNAG|ROLLBAR/i.test(envEx)) return true;
  if (/^\s*[-*]?\s*error monitoring\s*:\s*(?!todo|pending|none|abhi|not set)\S+/im.test(claudeMd(dir))) return true;
  return false;
}

function hasRollbackNotes(dir) {
  if (exists(dir, 'ROLLBACK.md') || exists(dir, 'docs', 'ROLLBACK.md')) return true;
  return /^#+\s*(rollback|backup)/im.test(claudeMd(dir));
}

function envIgnored(dir, isGit) {
  if (isGit) {
    const r = spawnSync('git', ['check-ignore', '-q', '.env'], { cwd: dir, timeout: 5000, windowsHide: true });
    if (!r.error) return r.status === 0;
  }
  const gi = readText(dir, '.gitignore');
  return /^\s*\/?\.env(\*|\.\*)?\s*$/m.test(gi);
}

function trackedSecretFiles(dir, isGit) {
  if (!isGit) return [];
  const out = git(dir, ['ls-files']);
  if (!out) return [];
  return out.split(/\r?\n/).filter((f) => f && isSecretFile(f));
}

// Returns { stack, empty, checks: [{ id, ok, critical, title }] }
function inspect(dir) {
  const stack = detectStack(dir);
  const empty = isEmptyProject(dir);
  const isGit = exists(dir, '.git') && git(dir, ['rev-parse', '--is-inside-work-tree']) !== null;
  const md = claudeMd(dir);
  const remotes = isGit ? (git(dir, ['remote']) || '').trim() : '';
  const tracked = trackedSecretFiles(dir, isGit);

  const checks = [
    { id: 'claude_md', ok: md.length > 0, title: 'CLAUDE.md (project ki rule book)' },
    { id: 'shield_rules', ok: /Shield by brAInam/i.test(md), title: '5 daily safety rules CLAUDE.md mein' },
    { id: 'git', ok: isGit, title: 'Git (har change ka record, undo ke liye)' },
    { id: 'env_ignored', ok: envIgnored(dir, isGit), title: '.env file .gitignore mein (secrets GitHub par na jayein)' },
    { id: 'no_tracked_secrets', ok: tracked.length === 0, critical: tracked.length > 0, title: 'Koi secret file git mein commit nahi hui', files: tracked },
    { id: 'tests', ok: !empty && hasTests(dir, stack), title: 'Automatic tests' },
    { id: 'ci', ok: hasCI(dir), title: 'CI (GitHub par har push par tests)' },
    { id: 'remote', ok: remotes.length > 0, title: 'GitHub backup (remote repo)' },
    { id: 'rollback', ok: hasRollbackNotes(dir), title: 'Rollback notes (kuch tootey to wapas kaise jayein)' },
    { id: 'monitoring', ok: hasMonitoring(dir), title: 'Error monitoring (live app ke errors pata chalein)' },
  ];
  return { stack, empty, isGit, checks };
}

module.exports = { inspect, detectStack, isSecretFile, findSecretInText, scanFileForSecret, git, readJson, exists };
