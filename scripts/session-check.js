#!/usr/bin/env node
// SessionStart hook: quietly checks the project's safety items and, if some are
// missing, tells the student in one short line and suggests /brainam-shield:start.
'use strict';

const path = require('path');
const os = require('os');
const { inspect, readJson } = require('./lib/project');

function readStdin() {
  try {
    return JSON.parse(require('fs').readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

const MSG = {
  hinglish: {
    empty: '🛡️ Shield: Naya project lag raha hai. Kuch banane se pehle /brainam-shield:start chalao, main shuru se hi suraksha laga deta hoon (2-3 minute).',
    missing: (n, total, list) => `🛡️ Shield: ${total} mein se ${n} safety cheezein missing hain (${list}). Theek karne ke liye /brainam-shield:start chalao.`,
    critical: (files) => `🚨 Shield: Secret file GitHub/git mein chali gayi hai: ${files}. Turant /brainam-shield:start chalao, main batata hoon kya karna hai.`,
  },
  hindi: {
    empty: '🛡️ Shield: यह नया प्रोजेक्ट लग रहा है। कुछ बनाने से पहले /brainam-shield:start चलाइए, मैं शुरू से ही सुरक्षा लगा दूँगा।',
    missing: (n, total, list) => `🛡️ Shield: ${total} में से ${n} सुरक्षा चीज़ें नहीं हैं (${list})। ठीक करने के लिए /brainam-shield:start चलाइए।`,
    critical: (files) => `🚨 Shield: एक secret फ़ाइल git में चली गई है: ${files}। तुरंत /brainam-shield:start चलाइए।`,
  },
  english: {
    empty: '🛡️ Shield: This looks like a new project. Before building anything, run /brainam-shield:start and I will set up safety from the start.',
    missing: (n, total, list) => `🛡️ Shield: ${n} of ${total} safety items are missing (${list}). Run /brainam-shield:start to fix them.`,
    critical: (files) => `🚨 Shield: A secret file was committed to git: ${files}. Run /brainam-shield:start now and I will help you fix it.`,
  },
};

const SHORT = {
  claude_md: 'CLAUDE.md',
  shield_rules: 'daily rules',
  git: 'git',
  env_ignored: '.env safety',
  no_tracked_secrets: 'secret leak',
  tests: 'tests',
  ci: 'CI',
  remote: 'GitHub backup',
  rollback: 'rollback notes',
  monitoring: 'error monitoring',
};

function main() {
  const input = readStdin();
  const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

  // Never nag in the home folder or a drive root.
  const resolved = path.resolve(dir);
  if (resolved === path.resolve(os.homedir()) || resolved === path.parse(resolved).root) return;

  const prefs = readJson(dir, '.claude', 'shield.json') || {};
  if (prefs.quiet === true) return;
  const lang = MSG[prefs.language] ? prefs.language : 'hinglish';
  const m = MSG[lang];

  const report = inspect(dir);
  const notAProject = report.stack.id === 'unknown' && !report.isGit && !report.empty;
  if (notAProject) return;

  const missing = report.checks.filter((c) => !c.ok);
  const critical = report.checks.find((c) => c.critical);
  let userMsg = null;
  let context;

  if (critical) {
    userMsg = m.critical(critical.files.join(', '));
    context =
      `Shield by brAInam safety check: CRITICAL - secret files are tracked in git: ${critical.files.join(', ')}. ` +
      'Tell the student plainly (in their language) right away, before other work. Recommend running /brainam-shield:start, which explains how to untrack the file, rotate the leaked keys, and add it to .gitignore. Never print the secret values.';
  } else if (report.empty) {
    userMsg = m.empty;
    context =
      'Shield by brAInam: this folder is an empty / new project. If the student asks to build something, first suggest (once, in one line) running /brainam-shield:start so git, .gitignore, CLAUDE.md rules, tests and CI are set up from the start. If they decline, build normally but still add tests and keep .env out of git.';
  } else if (missing.length > 0) {
    userMsg = m.missing(missing.length, report.checks.length, missing.map((c) => SHORT[c.id]).join(', '));
    context =
      `Shield by brAInam safety check (${report.stack.label}): missing ${missing.map((c) => c.title).join('; ')}. ` +
      'The student has already seen a one-line notice. Do not repeat the list unless asked; if it is relevant to what they ask, mention /brainam-shield:start once.';
  } else {
    context = `Shield by brAInam: all ${report.checks.length} safety checks pass (${report.stack.label}). For every change, follow the CLAUDE.md daily rules and use /brainam-shield:ship to go live.`;
  }

  const out = { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } };
  if (userMsg) out.systemMessage = userMsg;
  process.stdout.write(JSON.stringify(out));
}

try {
  main();
} catch {
  // A safety helper must never break the session. Stay silent on any error.
}
process.exit(0);
