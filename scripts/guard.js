#!/usr/bin/env node
// PreToolUse hook for the Bash tool: the "locks".
//  - blocks committing .env / secret files and well-known secret keys
//  - blocks force push and rm -rf (except throw-away folders like node_modules)
//  - asks before pushing straight to main/master (unless /brainam-shield:ship just checked everything)
//  - asks before commands that throw away unsaved work (git reset --hard, git clean -f)
'use strict';

const fs = require('fs');
const path = require('path');
const { isSecretFile, scanFileForSecret, git, readJson } = require('./lib/project');

const SHIP_MARKER = 'shield-ship-ok';
const SHIP_MARKER_MAX_AGE_MS = 15 * 60 * 1000;

// Folders that are safe to delete because tools rebuild them.
const THROWAWAY = new Set([
  'node_modules', 'dist', 'build', '.next', '.nuxt', 'out', 'coverage', '.cache', '.parcel-cache',
  '.turbo', '.vite', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', 'htmlcov',
  'vendor', '.dart_tool', 'tmp', '.tmp',
]);

const TEXT = {
  hinglish: {
    pushMain: 'Shield: Aap seedha main branch par push kar rahe ho, yaani change turant live/final ho jayega. Pehle /brainam-shield:ship chalana behtar hai (tests + review + khud try karna). Phir bhi push karna hai to Yes dabao.',
    lose: 'Shield: Is command se aapka bina-save (uncommitted) kaam hamesha ke liye mit sakta hai. Pakka karna hai?',
    pushAll: 'Shield: Ye command saari branches ek saath push karega. Pakka?',
  },
  hindi: {
    pushMain: 'Shield: आप सीधे main branch पर push कर रहे हैं, यानी बदलाव तुरंत live हो जाएगा। पहले /brainam-shield:ship चलाना बेहतर है। फिर भी push करना है तो Yes दबाइए।',
    lose: 'Shield: इस command से आपका बिना-save किया काम हमेशा के लिए मिट सकता है। पक्का करना है?',
    pushAll: 'Shield: यह command सारी branches एक साथ push करेगा। पक्का?',
  },
  english: {
    pushMain: 'Shield: You are pushing straight to main, so this change goes live right away. Running /brainam-shield:ship first is safer (tests + review + try it yourself). Press Yes to push anyway.',
    lose: 'Shield: This command can permanently erase work you have not committed. Are you sure?',
    pushAll: 'Shield: This command pushes every branch at once. Are you sure?',
  },
};

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

// Split a shell command into simple commands at && || ; | and newlines (outside quotes),
// and each simple command into words.
function splitCommands(cmd) {
  const commands = [];
  let words = [];
  let cur = '';
  let quote = null;
  let hasWord = false;
  const pushWord = () => {
    if (hasWord) words.push(cur);
    cur = '';
    hasWord = false;
  };
  const pushCmd = () => {
    pushWord();
    if (words.length) commands.push(words);
    words = [];
  };
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < cmd.length) cur += cmd[++i];
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      hasWord = true;
    } else if (ch === '\\' && i + 1 < cmd.length && cmd[i + 1] !== '\n') {
      cur += cmd[++i];
      hasWord = true;
    } else if (ch === ' ' || ch === '\t') {
      pushWord();
    } else if (ch === '\n' || ch === ';' || ch === '|' || ch === '&' || ch === '(' || ch === ')') {
      pushCmd();
    } else {
      cur += ch;
      hasWord = true;
    }
  }
  pushCmd();
  // Drop leading env assignments, sudo, command, etc.
  return commands.map((w) => {
    let i = 0;
    while (i < w.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[i]) || ['sudo', 'command', 'exec', 'nohup', 'time', 'env'].includes(w[i]))) i++;
    return w.slice(i);
  });
}

function shortFlags(words) {
  return words.filter((w) => /^-[A-Za-z]+$/.test(w)).map((w) => w.slice(1)).join('');
}

// ---------- rm -rf ----------
function isThrowawayTarget(t) {
  const clean = t.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  if (!clean || clean.includes('..') || clean.startsWith('/') || clean.startsWith('~') || /^[A-Za-z]:/.test(clean) || clean.includes('*') || clean.includes('$')) return false;
  const parts = clean.split('/');
  return THROWAWAY.has(parts[parts.length - 1]);
}

function checkDelete(w) {
  const name = (w[0] || '').toLowerCase();
  let recursiveForce = false;
  let targets = [];
  if (name === 'rm') {
    const f = shortFlags(w.slice(1));
    const recursive = /[rR]/.test(f) || w.includes('--recursive');
    const force = /f/.test(f) || w.includes('--force');
    recursiveForce = recursive && force;
    targets = w.slice(1).filter((x) => !x.startsWith('-'));
  } else if (name === 'remove-item' || name === 'ri' || name === 'del' || name === 'erase' || name === 'rd' || name === 'rmdir') {
    const lower = w.map((x) => x.toLowerCase());
    const ps = lower.some((x) => x.startsWith('-r')) && lower.some((x) => x.startsWith('-fo'));
    const cmd = lower.includes('/s') && lower.includes('/q');
    recursiveForce = ps || cmd;
    targets = w.slice(1).filter((x) => !x.startsWith('-') && !x.startsWith('/'));
  }
  if (!recursiveForce) return null;
  if (targets.length > 0 && targets.every(isThrowawayTarget)) return null;
  return {
    decision: 'deny',
    reason:
      `Shield by brAInam blocked "${w.join(' ')}": rm -rf (force delete) can wipe the project or other files with no undo. ` +
      'Tell the student in simple words (their language) that this was blocked for safety. If a file really needs deleting, delete specific files without -rf, or ask the student to do it themselves in their own terminal after checking the path. Throw-away folders like node_modules, dist, build, .next, vendor, __pycache__ can be deleted.',
  };
}

// ---------- git helpers ----------
function gitArgs(w) {
  if ((w[0] || '').toLowerCase() !== 'git' && (w[0] || '').toLowerCase() !== 'git.exe') return null;
  let i = 1;
  // skip global options like -c x=y, -C dir, --no-pager
  while (i < w.length && w[i].startsWith('-')) {
    if (w[i] === '-c' || w[i] === '-C') i += 2;
    else i += 1;
  }
  return { sub: w[i], rest: w.slice(i + 1) };
}

function currentBranch(cwd) {
  const out = git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  return out ? out.trim() : null;
}

function shipMarkerValid(cwd) {
  const gd = git(cwd, ['rev-parse', '--git-dir']);
  if (!gd) return false;
  const p = path.resolve(cwd, gd.trim(), SHIP_MARKER);
  try {
    const age = Date.now() - fs.statSync(p).mtimeMs;
    fs.unlinkSync(p); // one marker = one push
    return age >= 0 && age < SHIP_MARKER_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function checkPush(rest, cwd, t) {
  const flags = shortFlags(rest);
  const force =
    /f/.test(flags) ||
    rest.some((x) => x === '--force' || x.startsWith('--force-with-lease') || x === '--force-if-includes' || x === '--mirror' || x === '--delete' || x === '-d') ||
    rest.some((x) => !x.startsWith('-') && x.startsWith('+'));
  if (force) {
    return {
      decision: 'deny',
      reason:
        'Shield by brAInam blocked a force push / branch delete: it can permanently overwrite work on GitHub, for the student and for anyone else. ' +
        'Explain this simply to the student. Instead, pull first (git pull), fix any conflict, then push normally. If they truly need a force push, they must run it themselves after understanding the risk.',
    };
  }
  if (rest.includes('--all')) return { decision: 'ask', reason: t.pushAll };

  const positional = rest.filter((x) => !x.startsWith('-'));
  const refspecs = positional.slice(1);
  let toMain;
  if (refspecs.length === 0) {
    const b = currentBranch(cwd);
    toMain = b === 'main' || b === 'master';
  } else {
    toMain = refspecs.some((r) => {
      const dst = r.includes(':') ? r.split(':').pop() : r;
      const name = dst.replace(/^refs\/heads\//, '');
      if (name === 'HEAD') {
        const b = currentBranch(cwd);
        return b === 'main' || b === 'master';
      }
      return name === 'main' || name === 'master';
    });
  }
  if (!toMain) return null;
  // No remote yet: the push fails by itself, nothing can go live.
  if (!(git(cwd, ['remote']) || '').trim()) return null;
  if (shipMarkerValid(cwd)) return null;
  return { decision: 'ask', reason: t.pushMain };
}

function pendingFiles(cwd) {
  const out = git(cwd, ['status', '--porcelain', '--untracked-files=all']);
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      let p = l.slice(3);
      if (p.includes(' -> ')) p = p.split(' -> ').pop();
      return p.replace(/^"|"$/g, '');
    });
}

function stagedFiles(cwd) {
  const out = git(cwd, ['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
}

function secretProblem(files, cwd) {
  const secretFiles = files.filter(isSecretFile);
  if (secretFiles.length) return { files: secretFiles, kind: 'secret file' };
  for (const f of files) {
    const hit = scanFileForSecret(path.resolve(cwd, f));
    if (hit) return { files: [f], kind: hit };
  }
  return null;
}

function secretDeny(problem, action) {
  return {
    decision: 'deny',
    reason:
      `Shield by brAInam blocked this ${action}: ${problem.kind} found in ${problem.files.join(', ')}. ` +
      'Secrets (passwords, API keys) must never go to git or GitHub, because anyone who sees the repo can use them. ' +
      'Do NOT print or repeat the secret value. Tell the student simply what was blocked and why, then fix it: add the file to .gitignore (and keep an .env.example with empty values), or move the key into .env and read it from there; if the file is already staged, unstage it with "git restore --staged <file>". Then try again.',
  };
}

function checkAdd(rest, cwd) {
  const broad = rest.some((x) => x === '.' || x === '-A' || x === '--all' || x === '-u' || x === '--update' || x === '*' || x === ':/');
  const named = rest.filter((x) => !x.startsWith('-'));
  const pending = pendingFiles(cwd);
  let candidates;
  if (broad) candidates = pending;
  else {
    candidates = [];
    for (const n of named) {
      const norm = n.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
      candidates.push(norm);
      for (const p of pending) if (p.startsWith(norm + '/')) candidates.push(p);
    }
  }
  const forced = rest.includes('-f') || rest.includes('--force');
  // Without -f, git itself skips ignored files, so only look at what git would really add.
  if (!forced) {
    const pendingSet = new Set(pending);
    candidates = candidates.filter((c) => pendingSet.has(c) || isSecretFile(c));
    if (candidates.length) {
      const ignored = git(cwd, ['check-ignore', ...candidates.filter(isSecretFile)]);
      const ignoredSet = new Set((ignored || '').split(/\r?\n/).filter(Boolean));
      candidates = candidates.filter((c) => !ignoredSet.has(c));
    }
  }
  const problem = secretProblem([...new Set(candidates)], cwd);
  return problem ? secretDeny(problem, 'git add') : null;
}

function checkCommit(rest, cwd) {
  const flags = shortFlags(rest);
  const all = /a/.test(flags) || rest.includes('--all');
  let files = stagedFiles(cwd);
  if (all) {
    const out = git(cwd, ['diff', '--name-only', '--diff-filter=ACMR']);
    files = files.concat(out ? out.split(/\r?\n/).filter(Boolean) : []);
  }
  const problem = secretProblem([...new Set(files)], cwd);
  return problem ? secretDeny(problem, 'commit') : null;
}

function checkDestructiveGit(sub, rest, t) {
  if (sub === 'reset' && rest.includes('--hard')) return { decision: 'ask', reason: t.lose };
  if (sub === 'clean' && /f/.test(shortFlags(rest) + (rest.includes('--force') ? 'f' : ''))) return { decision: 'ask', reason: t.lose };
  if ((sub === 'checkout' || sub === 'restore') && rest.includes('.') && !rest.includes('--staged')) return { decision: 'ask', reason: t.lose };
  return null;
}

function evaluate(command, cwd, lang) {
  const t = TEXT[lang] || TEXT.hinglish;
  let ask = null;
  // In "git add . && git commit", the commit check must see what the add will stage.
  let addedBroad = false;
  for (const w of splitCommands(command)) {
    if (!w.length) continue;
    const del = checkDelete(w);
    if (del) return del;
    const g = gitArgs(w);
    if (!g || !g.sub) continue;
    let r = null;
    if (g.sub === 'push') r = checkPush(g.rest, cwd, t);
    else if (g.sub === 'add') {
      r = checkAdd(g.rest, cwd);
      if (g.rest.some((x) => x === '.' || x === '-A' || x === '--all')) addedBroad = true;
    } else if (g.sub === 'commit') r = checkCommit(addedBroad ? g.rest.concat('--all') : g.rest, cwd);
    else r = checkDestructiveGit(g.sub, g.rest, t);
    if (r && r.decision === 'deny') return r;
    if (r && !ask) ask = r;
  }
  return ask;
}

function main() {
  const input = readStdin();
  if (input.tool_name !== 'Bash' && input.tool_name !== 'PowerShell') return;
  const command = (input.tool_input && input.tool_input.command) || '';
  if (!command) return;
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const prefs = readJson(process.env.CLAUDE_PROJECT_DIR || cwd, '.claude', 'shield.json') || {};
  const result = evaluate(command, cwd, prefs.language);
  if (!result) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: result.decision,
        permissionDecisionReason: result.reason,
      },
    })
  );
}

module.exports = { evaluate, splitCommands };

if (require.main === module) {
  try {
    main();
  } catch {
    // Never crash the student's session because of the guard itself.
  }
  process.exit(0);
}
