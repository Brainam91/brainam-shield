---
name: ship
description: Safe go-live for every change (Shield by brAInam). Runs the tests, a code review, a "try it yourself" checklist the student confirms, and only then commits and pushes, with a plain summary of what went live and how to undo it. Use when the student runs /brainam-shield:ship or says they want to push, deploy, publish or make a change live.
---

# Shield by brAInam: ship a change safely

The student is usually **non-technical**. Your job is to make sure nothing broken goes live, and to explain every step in their language (read `.claude/shield.json` → `language`; default Hinglish) in plain words.

Stop at the first step that fails, explain simply what is wrong, offer to fix it, and start again from Step 1 after the fix. Never skip a step to "save time". Never push if the student has not confirmed Step 5.

## Step 1: What changed?

Run `git status --short` and `git diff --stat` (plus `git diff --cached --stat`).
- Nothing changed and nothing to push → say so and stop.
- Summarise the change in 1-3 plain lines ("Contact form mein phone number ka field add hua").
- More than ~15 files or several unrelated features → gently remind rule 1 (ek baar mein ek chhota change) and ask if they want to ship it anyway or split it. Their choice.
- If you are not on `main`/`master`, note the branch name; the push in Step 7 goes to this branch.

## Step 2: Safety status

Run:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/status.js"
```
- `no_tracked_secrets` critical, or `env_ignored` not ok → stop; fix with `/brainam-shield:start` first.
- No `tests` → warn: "Test nahi hain, isliye mujhe pakka nahi pata kuch toota ya nahi." Offer to add a test for this change now (recommended). If they refuse, continue but say it in the final summary.

## Step 3: Run the tests

Use the project's test command (from CLAUDE.md "Commands", or by stack: `npm test`, `php artisan test`, `.venv/bin/pytest` / `pytest`, `flutter test`). Also run the build if there is one (`npm run build --if-present`) because a broken build cannot go live.
- All pass → "✅ Tests pass (N tests)".
- Something fails → explain in plain words which feature broke and why (not the stack trace), fix it with the student's OK, re-run. Never delete or weaken a test just to make it pass; if the test itself is outdated, explain and ask.

## Step 4: Code review

Run the built-in review on the current changes: use the Skill tool with skill `code-review` (it reviews the current diff). If that skill is not available, review the diff yourself for: bugs, broken edge cases (empty input, wrong login, no internet), security (secrets in code, SQL injection, missing auth checks, `DEBUG=True` going live), and anything that deletes data.
- Explain each important finding in one plain line with its risk ("Agar koi khaali form bheje to app crash ho jayega").
- Fix the serious ones with the student's OK, then go back to Step 3.
- Small style notes: mention briefly, do not block.

## Step 5: Try it yourself (student confirms)

Tell the student exactly how to open the app (e.g. "Terminal mein `npm run dev` chalao, browser mein http://localhost:5173 kholo"). Offer to start it for them in the background.

Then give a **specific** 3-5 item checklist for THIS change, plus 1-2 items for old features that could be affected. Example:
1. Contact page kholo → naya "Phone" field dikh raha hai?
2. Galat phone number daal kar bhejo → error message aata hai?
3. Sahi details bhejo → "Thank you" dikhta hai?
4. Home page aur Login ab bhi pehle jaise chal rahe hain?

Ask with AskUserQuestion: "Kya sab kuch theek chala?" options: **Haan, sab theek hai** / **Kuch gadbad hai** (they describe it). If something is wrong → fix → back to Step 3.

## Step 6: Save (commit)

Stage the changed files by name (or `git add -A` if the list is clean), then commit with a plain message describing the change for a human ("Contact form: phone number field added"). The Shield lock blocks the commit if a secret slipped in; fix it and retry.

## Step 7: Go live (push)

- No GitHub remote (`git remote` empty) → the change is saved locally only. Give the "GitHub backup" steps from `/brainam-shield:start` and stop here.
- On a feature branch → push it (`git push -u origin <branch>`). If they use pull requests, give the PR link / steps.
- On `main`/`master` → all checks passed, so record that, then push:
  ```bash
  node "${CLAUDE_PLUGIN_ROOT}/scripts/ship-ok.js"
  git push
  ```
  (`ship-ok.js` tells the Shield lock that this push went through /ship, so it will not ask again. It works for one push within 15 minutes.) If the remote has new commits and the push is rejected, run `git pull --rebase`, re-run tests, then push. Never force push.

If the project deploys automatically from GitHub (Vercel, Netlify, etc.), tell them where to see the deploy and to open the live link once it is green.

## Step 8: Plain summary

```
🚀 Live ho gaya: <one line what changed>
✅ Tests: N pass   ✅ Review: <ok / fixed X>   ✅ Aapne khud check kiya
🔗 Kahan dekhein: <live URL or "GitHub par save hua">
↩️ Kuch gadbad lage to Claude ko bolo: "pichhla change wapas lao" (Claude `git revert HEAD` karke, tests chala kar, /brainam-shield:ship se wapas live karega)
```
Mention anything skipped (e.g. "Is change ka test nahi tha").
