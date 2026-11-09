# Other stacks and no-code platforms

These are detected but were not part of Shield's first test round. Do the universal parts (git, secrets in .gitignore, CLAUDE.md rules, GitHub backup, rollback notes) fully, and the stack parts carefully, telling the student which parts are "basic" for now.

## WordPress
- Usually only the custom theme/plugin folder should be in git (e.g. `wp-content/themes/<theme>`), not WordPress core or uploads. Ask before running `git init` at the root.
- `.gitignore`: `wp-config.php` (has DB password), `wp-content/uploads/`, `wp-content/cache/`, `*.log`, plus the Shield lines.
- Tests: for a custom plugin/theme with PHP logic, PHPUnit via `wp scaffold plugin-tests` (needs WP-CLI). For a simple theme, use the "try it yourself" checklist in `/brainam-shield:ship` as the main safety net, and say so.
- Backup / rollback: a backup plugin (UpdraftPlus) or the hosting's backup; take one before every plugin/theme update. Staging: many hosts (Hostinger, SiteGround) have one-click staging.
- Error monitoring: hosting error logs, or the Sentry WordPress plugin ("WP Sentry").

## Flutter
- Tests: `flutter test` (the default `test/widget_test.dart` counts once it tests the real app).
- CI: GitHub Actions with `subosito/flutter-action@v2`, then `flutter pub get`, `flutter analyze`, `flutter test`.
- Secrets: `android/key.properties`, `*.jks` keystores, `google-services.json`, `GoogleService-Info.plist` must stay out of git (the Shield lines cover most; add the iOS plist).
- Error monitoring: Firebase Crashlytics or `sentry_flutter`.

## Android (Kotlin/Java)
- Tests: `./gradlew test` (Windows: `gradlew.bat test`).
- CI: `actions/setup-java@v4` (temurin 17) then `./gradlew test`.
- Secrets: keystores (`*.jks`, `*.keystore`), `key.properties`, `local.properties`, `google-services.json`.
- Error monitoring: Firebase Crashlytics.
- Rollback: Play Console → staged rollout; halt the rollout if crashes rise.

## Plain HTML site
- Git, secrets, CLAUDE.md, backup apply fully. Tests are optional; the "try it yourself" checklist is the main check. CI can be skipped and marked "not needed" in the report.

## No-code platforms (Lovable, Bolt, Bubble, Framer, Webflow, Wix)

Say plainly what applies:

| Platform | What Shield can do | What does not apply | Do this instead |
|---|---|---|---|
| **Lovable / Bolt** | They create a real React + Vite project. Connect it to GitHub from the platform, clone it here, and run the normal React setup (tests, CI, locks all work). | Changes made inside the platform skip Shield's locks. | Make bigger changes here with Claude Code, or always pull and run tests before publishing. |
| **Bubble** | Only the CLAUDE.md habits (plan, small change, try it yourself). | No code files: no git, tests, CI or locks. | Use Bubble's **Development vs Live** versions as staging, its **Save points / Restore** as rollback, and its **Logs** for errors. Never put API keys in public workflows; use Bubble's "Private key" fields. |
| **Framer / Webflow / Wix** | CLAUDE.md habits and a "try it yourself" checklist. | No git/tests/CI. | Use the platform's **staging/preview link** before publishing, its **version history / backups** to roll back, and keep API keys only in the platform's secret/env settings. If they export code, Shield can protect the exported copy. |
