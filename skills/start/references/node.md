# React (Vite), Next.js and other Node projects

Needs Node.js 22 LTS or newer (`node -v`; Vite and Next.js need at least 20.19). If missing or older, tell the student: nodejs.org → download the **LTS** version → install with defaults → close and reopen Claude Code.

After install, npm may say "N moderate vulnerabilities". Tell the student **not** to run `npm audit fix --force`: it can downgrade or break Next.js/Vite. Updating the framework normally later fixes most of these.

npm often prints yellow `warn` lines during install (deprecated packages, optional scripts like `fsevents`). Tell the student these are normal and safe to ignore; only red `ERR!` lines mean something failed.

## New project in a non-empty folder

The folder already has Shield files (CLAUDE.md, .gitignore, .claude/), and the official generators may refuse a non-empty folder. So generate into a temporary sub-folder and move the files up:

**React + Vite**
```bash
npm create vite@latest shield-tmp-app -- --template react --no-interactive
```
(Use `react-ts` if the student wants TypeScript; default to plain `react` for beginners. If `--no-interactive` is not recognised, drop it.)

**Next.js**
```bash
npx create-next-app@latest shield-tmp-app --js --eslint --app --src-dir --no-tailwind --import-alias "@/*" --use-npm --yes
```
(Add `--tailwind` instead of `--no-tailwind` if they want Tailwind.)

Then move the files up **without overwriting anything of ours**:
1. Append the lines of `shield-tmp-app/.gitignore` to our `.gitignore` (skip duplicates), then delete `shield-tmp-app/.gitignore`. If the generator made a `README.md` and we already have one, keep ours and delete theirs.
2. Move the rest, never overwriting: macOS/Linux `mv -n shield-tmp-app/* shield-tmp-app/.[!.]* . 2>/dev/null`; Windows PowerShell `Get-ChildItem shield-tmp-app -Force | Move-Item -Destination .` (it stops instead of overwriting). Check that `shield-tmp-app/` is now empty, then remove it.
3. In `package.json`, change `"name": "shield-tmp-app"` to a short kebab-case name of the project (e.g. `photo-portfolio`).
4. Run `npm install` and check that `npm run dev` starts.
5. Replace the generator's demo page with a simple first page for what the student is building (title, one line about it, sections they mentioned), so the first test checks something real, not the demo text.

## Tests with Vitest

### React + Vite
```bash
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```
Add to `vite.config.js` (keep existing plugins):
```js
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
```
`src/setupTests.js`:
```js
import '@testing-library/jest-dom/vitest';
```
In `package.json` scripts: `"test": "vitest run"` and `"test:watch": "vitest"`.

First test next to the component, e.g. `src/App.test.jsx`, testing something visible the student can understand:
```jsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('home page shows the main heading', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
});
```
Adjust to what the page really shows. Run `npm test` and make sure it passes.

### Next.js
```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom vite-tsconfig-paths
```
`vitest.config.mjs`:
```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  // JavaScript projects only: Next.js keeps JSX inside .js files, so tell Vite to read them as JSX.
  // (Leave this block out for a TypeScript project, where components are .tsx.)
  oxc: {
    include: /\.[jt]sx?$/,
    exclude: [],
    lang: 'jsx',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.mjs',
    exclude: ['node_modules', '.next', 'e2e'],
  },
});
```
`vitest.setup.mjs`: `import '@testing-library/jest-dom/vitest';`

Scripts: `"test": "vitest run"`. First test, e.g. `src/app/page.test.jsx` (or `app/page.test.jsx`), for a **synchronous** page or component (async Server Components cannot be unit tested this way; test their child components instead):
```jsx
import { render, screen } from '@testing-library/react';
import Page from './page';

test('home page renders', () => {
  render(<Page />);
  expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
});
```
Pick an assertion that matches what the page really shows.

Vite may print a notice suggesting `resolve.tsconfigPaths` instead of `vite-tsconfig-paths`, and npm may warn that `tsconfck` is deprecated. Keep the plugin (the built-in option did not resolve `@/` from `jsconfig.json` in testing) and tell the student these notices are harmless.

If the project already uses **Jest** (`jest` in devDependencies), keep Jest; do not switch tools.

## CI

Copy `templates/ci/node.yml` to `.github/workflows/tests.yml`. If the project uses `pnpm` or `yarn` (lock file), change `cache` and the install step accordingly. It runs lint (if present: new Vite templates use `oxlint`, Next.js uses ESLint; both run via `npm run lint`), tests and build, so a broken build also shows red.

## Commands for CLAUDE.md
- Run: `npm run dev` (Vite: http://localhost:5173, Next.js: http://localhost:3000)
- Test: `npm test`

## Error monitoring (Sentry)
- **Next.js**: the student runs `npx @sentry/wizard@latest -i nextjs` in their own terminal (it opens the browser to log in), then sets `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` in hosting env variables.
- **React + Vite**: `npm install @sentry/react`, then in `src/main.jsx`:
  ```js
  import * as Sentry from '@sentry/react';
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
  }
  ```
  Add `VITE_SENTRY_DSN=` (empty) to `.env.example`; the student fills `.env` and the hosting env variable.

## Rollback hints
- Vercel: Project → Deployments → pichhla green deploy → ⋯ → **Promote to Production** (Instant Rollback).
- Netlify: Site → Deploys → pichhla deploy → **Publish deploy**.
