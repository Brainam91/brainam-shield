# Shield by brAInam

**Claude Code ke saath banao, bina dar ke.** Shield safety ki aadatein apne aap laga deta hai: plan, tests, code review, CI, backup, rollback, error monitoring aur `.env` ki suraksha. Ye un logon ke liye bana hai jo code padh nahi sakte, par Claude Code se apps bana rahe hain.

*Safety habits on autopilot for people who build with Claude Code. It replies in whatever language you write in.*

## Shield kya karta hai

| Kab | Kya hota hai |
|---|---|
| **Project kholte hi** | 10 safety cheezein chupchaap check karta hai: CLAUDE.md, daily rules, git, `.env` safety, secret leak, tests, CI, GitHub backup, rollback notes, error monitoring. Kuch missing ho to ek line mein batata hai. Khaali folder mein sirf `/brainam-shield:start` chalane ko kehta hai. |
| **`/brainam-shield:start`** (har project mein ek baar) | Aap jis bhasha mein likho (Hindi, Hinglish, English), usi mein jawab deta hai. Project ke baare mein 4 simple sawaal poochta hai, stack pehchanta hai, aur jo missing hai wo set karta hai. Har step simple shabdon mein samjhata hai. Jo kaam sirf aap kar sakte ho (GitHub account, Sentry), uske steps deta hai. Aakhir mein ✅ / ⏳ report deta hai. |
| **`/brainam-shield:ship`** (har change par) | Tests → code review → "khud try karo" checklist (aap confirm karte ho) → tabhi commit + push. Aakhir mein simple summary: kya live hua, aur gadbad ho to wapas kaise jayein. |
| **Hamesha (locks)** | `.env`, passwords aur API keys ka commit **block**. `git push --force` **block**. `rm -rf` **block** (sirf `node_modules`, `dist`, `build` jaise folders allowed). Seedha `main` par push karne se pehle **poochta hai** aur `/brainam-shield:ship` suggest karta hai. `git reset --hard` / `git clean -f` se pehle poochta hai. |

Plugin ke saath ek CLAUDE.md template bhi aata hai. Usme roz ke 5 rules hain:
1. Ek baar mein ek chhota change
2. Pehle plan
3. Baad mein tests + `/code-review`
4. Khud try karo
5. Sab theek ho tabhi live karo

## Install

Claude Code mein (terminal ya desktop app):

```bash
claude plugin marketplace add Brainam91/brainam-shield
claude plugin install brainam-shield@brainam
```

Ya Claude Code session ke andar: `/plugin marketplace add Brainam91/brainam-shield` aur phir `/plugin install brainam-shield@brainam`.

Install ke baad apna project folder kholo aur chalao:

```
/brainam-shield:start
```

## Zaroori cheezein

- **Claude Code** (CLI, desktop app ka Code tab, ya Cowork).
- **Node.js** (22 LTS ya naya). Shield ke checks aur locks Node se chalte hain, isliye ye macOS, Windows aur Linux par ek jaisa kaam karte hain (locks ke liye Node 18 bhi chalega, par React/Next.js ke liye 22 chahiye). Node nahi hai to nodejs.org se LTS version install karo.
- **Git**. Windows par "Git for Windows" install karo.

## Kaunse stacks

| Stack | Status |
|---|---|
| React (Vite), Next.js, Node | Poora setup: Vitest/Jest, GitHub Actions CI, Sentry |
| Laravel / PHP | Poora setup: PHPUnit/Pest, GitHub Actions CI, Sentry |
| Django / Python | Poora setup: pytest, GitHub Actions CI, Sentry |
| WordPress, Flutter, Android, plain HTML | Basic setup aur guidance (pehle round mein test nahi kiya) |
| Lovable / Bolt | Ye React + Vite export karte hain, isliye GitHub se clone karke React wala poora setup |
| Bubble, Framer, Webflow, Wix | Sirf habits. Plugin saaf batata hai ki kya lagu nahi hota aur uski jagah kya karna hai |

## Kahan kya chalta hai

- **Claude Code aur Cowork**: sab kuch (skills + hooks/locks).
- **claude.ai chat**: sirf skills. Wahan locks aur auto-check nahi chalte.

## Data aur privacy

Shield koi personal data nahi padhta, store nahi karta, aur kahin bhejta bhi nahi. Saare checks aapke computer par hi chalte hain. Ye sirf project ki files ke naam aur git status dekhta hai. Secret dhoondhte waqt ye file ka text aapke computer par hi scan karta hai, aur kabhi bhi secret ki value print ya send nahi karta. Iski sirf ek setting hai, aapki bhasha, jo project ke `.claude/shield.json` mein save hoti hai. Network call ek bhi nahi hoti.

## Shield ko chup karana

Kisi project mein session start wala message nahi chahiye to `.claude/shield.json` mein `"quiet": true` likho. Locks phir bhi chalte rahenge.

## License

MIT © Sachin Arora (brAInam)
