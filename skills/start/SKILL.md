---
name: start
description: One-time safety setup for a project (Shield by brAInam). Asks the student's language and a few plain questions, detects the stack (React/Vite, Next.js, Laravel, Django, WordPress, Flutter, Android, no-code), and sets up whatever is missing - git, .gitignore for secrets, CLAUDE.md daily rules, tests, GitHub Actions CI, backup, rollback notes, error monitoring - explaining each step simply. Use when the student runs /brainam-shield:start, starts a new project, or the Shield session check reports missing safety items.
---

# Shield by brAInam: project setup

You are setting up safety habits for a **non-technical student** who builds with Claude Code. They often cannot read code, so the safety has to be automatic and every step has to be explained in plain words. Be warm and short. No jargon without a one-line meaning.

Plugin files are at `${CLAUDE_PLUGIN_ROOT}`. Templates are in `${CLAUDE_PLUGIN_ROOT}/templates/`, stack guides in `${CLAUDE_PLUGIN_ROOT}/skills/start/references/`.

## Hard rules

- Never ask the student to paste passwords, API keys or tokens into chat. If they need a key, they put it in `.env` themselves; you only create the empty name in `.env.example`.
- Never read `.env` aloud or print secret values.
- Do not push to GitHub, create accounts, or change hosting settings yourself. Give the student exact steps for those.
- Ask before installing anything big or changing existing code. Small safety files (.gitignore lines, CLAUDE.md, CI file, test setup) are part of this setup; tell them what you are adding.
- One step at a time. After each step, say in 1-2 lines: what it is, and how it protects them (use an everyday example).

## Step 1: Check where we are

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/status.js"
```

It prints JSON: `stack`, `empty` (new folder), `isGit`, and `checks` (each with `ok`). Keep it for the final report. If a check has `critical: true` (a secret file is already in git), handle that first (see "Secret already leaked" below).

## Step 2: Language

Use the AskUserQuestion tool: "Aap kis bhasha mein baat karna pasand karenge? / Which language do you prefer?" with options **Hinglish**, **Hindi**, **English**. From now on, speak only in that language.

Save the choice so the hooks speak the same language. Create or update `.claude/shield.json`:

```json
{ "language": "hinglish" }
```

(`hinglish`, `hindi` or `english`.)

## Step 3: Four simple questions

Ask these with AskUserQuestion (you can put up to 4 questions in one call), in the chosen language:

1. **Kya bana rahe ho?** (free text via "Other"; offer examples like "Website / landing page", "App with login", "Online store", "Internal tool")
2. **Kaun use karega?** Sirf main / Kuch log (team, clients) / Public (koi bhi) / Public + online payment
3. **Kahan live karoge?** Pata nahi abhi / Vercel or Netlify / Hostinger-cPanel type hosting / Apna server (VPS) / Play Store
4. **GitHub account hai?** Haan / Nahi / Pata nahi kya hota hai

Use the answers to decide how strict to be: public + payments means error monitoring and backups are "must do"; "sirf main" means they are "achha hoga".

## Step 4: Detect the stack

From `status.js` → `stack.id`:

| stack.id | Guide to read |
|---|---|
| `react`, `nextjs`, `node` | `references/node.md` |
| `laravel`, `php` | `references/laravel.md` |
| `django`, `python` | `references/django.md` |
| `wordpress`, `flutter`, `android`, `static`, `unknown` | `references/other.md` |

**Empty folder (`empty: true`)**: nothing is built yet. Do the safety basics first (Step 5 items 1-3), then suggest a stack in one line based on their answers, and ask for a yes:
- Simple website / landing page / portfolio → **React + Vite**
- App with login, database, or SEO pages → **Next.js**
- If the student said they know or want PHP/Laravel or Python/Django → that one

On yes, create the app with the official tool from the guide **inside the current folder**, then continue with tests and CI from that guide. If they want to wait, finish the basics and tell them: "Jab Claude ko bologe 'ye banana hai', tests aur CI saath mein lag jayenge" - and make sure the CLAUDE.md says so.

**No-code platform** (the student says they use Lovable, Bolt, Bubble, Framer, Webflow, Wix): read the no-code section of `references/other.md` and say plainly which parts apply and which do not.

Tell the student in one line what you found, e.g. "Aapka project **Next.js** mein hai."

## Step 5: Set up what is missing

Go through only the checks that are not `ok`, in this order. For each: do it (or give steps), then explain it simply.

1. **Git** (`git`): `git init -b main` (if `-b` fails on old git: `git init` then `git checkout -b main`). Explain: "Git har change ki photo leta hai. Kuch tootey to pichhli photo par wapas ja sakte ho."
2. **Secrets safe** (`env_ignored`): append the lines from `templates/gitignore-secrets.txt` to `.gitignore` (create it if missing, keep existing lines, do not duplicate). If `.env` exists and `.env.example` does not, create `.env.example` with the same variable **names** and empty values (read only the names, never copy values). Explain: ".env mein aapke passwords/keys hote hain. Ye ab GitHub par kabhi nahi jayegi."
3. **CLAUDE.md + daily rules** (`claude_md`, `shield_rules`): copy `templates/CLAUDE.md`, fill the `{{...}}` parts from the answers and the stack guide, and **write it in the student's language** (keep the line "Shield by brAInam" and the headings `## Rollback` and `## Error monitoring`). If a CLAUDE.md already exists, keep everything in it and add the Shield sections at the end. Explain the 5 rules in 5 short lines.
4. **Tests** (`tests`): follow the stack guide. Add the test tool, one real test for something the app already does (or a simple "app loads" test), and make the test command work. Run it and show that it passes. Explain: "Test ek chowkidaar hai: har baar check karta hai ki jo pehle chal raha tha, wo ab bhi chal raha hai."
5. **CI** (`ci`): copy the stack's file from `templates/ci/` to `.github/workflows/tests.yml` (adjust versions to the project as the guide says). Explain: "GitHub har baar aapke tests khud chalayega. Laal nishaan = kuch toota, live mat karo."
6. **First save point**: if there are uncommitted files, commit them now with a plain message like "Shield setup: safety basics". (The Shield lock will stop the commit if a secret slipped in; fix it and retry.)
7. **GitHub backup** (`remote`): this needs the student. Give steps from "Student-only steps" below. If they have the `gh` CLI and are logged in, you may offer to run `gh repo create <name> --private --source . --push` but only after they say yes.
8. **Rollback notes** (`rollback`): the `## Rollback` section of CLAUDE.md covers it. Fill the hosting line from their answer (Vercel/Netlify: "Deployments mein pichhla deploy chuno → Promote/Publish"; cPanel: "File Manager backup / Backup Wizard"; VPS: "pichhla git commit deploy karo"). For a database, write how to take a backup for their stack.
9. **Error monitoring** (`monitoring`): if the app is public, recommend Sentry (free plan) and follow the stack guide's Sentry section; the DSN goes in `.env` by the student, never in chat. If they want to skip for now, write `Error monitoring: TODO (live karne se pehle Sentry lagana hai)` in CLAUDE.md - it will stay "pending" in the report. If they set it up, write `Error monitoring: Sentry`.

## Secret already leaked

If `no_tracked_secrets` is critical:
1. Tell them calmly: a secret file is in git history; if the repo is on GitHub, treat those keys as public.
2. Untrack it without deleting the local file: `git rm --cached <file>`, make sure it is in `.gitignore`, commit "Remove secrets from git".
3. Tell the student to **change (rotate) every key/password in that file** on each service's website (e.g. new Stripe key, new DB password), then put the new values in `.env` themselves. Removing the file from git does not remove it from old history.
4. If the repo is public, suggest making it private on GitHub (Settings → General → Danger Zone → Change visibility) until keys are rotated.

## Student-only steps (give these as numbered steps, in their language)

**GitHub account + backup repo**
1. github.com par jao → Sign up (email, password, username). Email verify karo.
2. Upar right mein **+** → **New repository** → naam do (jaise project ka naam) → **Private** chuno → kuch tick mat karo → **Create repository**.
3. Wahan dikhne wali link copy karke mujhe do (sirf link, password nahi). Main remote jod dunga: `git remote add origin <link>` aur aapki "haan" ke baad `git push -u origin main`.
4. Pehli baar push par GitHub login maangega: browser mein sign in karo. Password chat mein kabhi mat likhna.

**Main branch ko surakshit karna (optional, team ke liye)**: GitHub repo → Settings → Branches → Add rule → Branch name `main` → tick "Require status checks to pass" → Tests chuno → Save.

**Sentry (error monitoring)**: sentry.io → Sign up (free) → Create project → apna stack chuno → jo DSN dikhe use **`.env` file mein khud** `SENTRY_DSN=...` likh kar save karo. Mujhe chat mein mat bhejna. Hosting (Vercel/Netlify/cPanel) ke environment variables mein bhi yahi daalo.

## Step 6: Final report

Run `status.js` again and give a short report in their language:

```
🛡️ Shield report: <project> (<stack>)

✅ Ho gaya
- ...

⏳ Baaki (aapko karna hai)
- ... (with the one-line next step)

Ab se har change ke baad: /brainam-shield:ship
```

Use ✅ for checks now `ok`, ⏳ for the rest, with who must do it. End with one line on the daily habit: chhota change → plan → tests + review → khud try → `/brainam-shield:ship`.
