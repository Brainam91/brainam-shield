# Shield by brAInam: test report (v0.1.0, 9 Nov 2026)

## What was tested

| Area | How | Result |
|---|---|---|
| Plugin structure | `claude plugin validate --strict .` (Claude Code 2.1.317) | ✅ passed |
| Locks (guard) | `tests/guard.test.js`: 42 cases (rm -rf, force push, push to main, ship marker, .env / key files, live keys in code, `git add .`, `commit -a`, reset --hard, PowerShell `Remove-Item`) | ✅ 42/42 |
| Stack detection + checks | `tests/project.test.js`: 21 cases (React, Next.js, Laravel, Django, Python, WordPress, Flutter, static; Laravel example tests, npm placeholder test, TODO monitoring) | ✅ 21/21 |
| Hooks as Claude Code runs them | `tests/hooks.test.js`: JSON in/out, language setting, quiet mode, bad input never crashes | ✅ 11/11 |
| `/start` + `/ship` end to end | Each skill's instructions followed on a real sample project: empty folder, React (Vite), Next.js 16, Laravel 12 (PHP 8.4), Django | ✅ all 5: safety set up, tests + build pass, change shipped to a local commit |
| Locks on the 5 set-up projects | guard run in each: `git add .` allowed with ignored `.env`; blocked with a live key file; `git add -f .env`, force push and `rm -rf src` blocked; `.env.example` not ignored | ✅ all 5 |

Final status on every sample project: 8 of 10 checks ✅; GitHub backup and error monitoring ⏳ (both need the student's own account, as designed).

Fixes made from the test runs: Next.js 16 Vitest config (JSX in `.js` files), Laravel CI PHP 8.4, Django `.env` loading + safe `DEBUG` default, safe file move after scaffolding, new files visible to review (`git add -N`), git name/email on new machines, honest "live vs saved" summary, cPanel deploy steps, Node 22 requirement.

## Not tested yet (stated plainly)

- **Hooks inside a live Claude Code session.** The Mac's Claude CLI is not logged in, so the hooks were tested by running the scripts exactly as Claude Code calls them (JSON on stdin), not inside a real session. To check: install the plugin, open a project, and see the 🛡️ message; ask Claude to `git push --force` and see it blocked.
- **The `/brainam-shield:...` slash commands themselves.** The skill instructions were followed by test agents; the slash-command loading was checked only by the validator.
- **Windows and Linux.** Everything ran on macOS. `.github/workflows/test.yml` runs the tests on Windows, macOS and Linux with Node 18 and 22 once the repo is on GitHub.
- **Real GitHub push, Vercel/Netlify/cPanel deploys, Sentry.** These need accounts; only the instructions were written.
- **WordPress, Flutter, Android, no-code platforms.** Detected and guided, not tested.
- **claude.ai chat and Cowork.**

## Run the tests

```bash
npm test
```
