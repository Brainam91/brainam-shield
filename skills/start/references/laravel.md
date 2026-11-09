# Laravel (PHP)

Needs PHP 8.2+ and Composer (`php -v`, `composer -V`). If missing, tell the student the easiest route:
- **macOS / Linux**: `/bin/bash -c "$(curl -fsSL https://php.new/install/mac/8.4)"` (Linux: `.../install/linux/8.4`) — the installer from the official Laravel docs. Then reopen the terminal.
- **Windows**: Laravel Herd (herd.laravel.com) → install → it adds PHP and Composer. Or the PowerShell command from laravel.com/docs/installation.

## New project in a non-empty folder

```bash
composer create-project laravel/laravel shield-tmp-app
```
Move everything (including hidden files like `.env.example`, `.gitignore`, `.editorconfig`) from `shield-tmp-app/` up into the project folder, merge `.gitignore` lines (keep the Shield secret lines), and delete the empty temp folder. `.env` is created by the installer: move it too, but never print it. Check: `php artisan serve` → http://127.0.0.1:8000.

## Tests

Laravel already ships PHPUnit, `phpunit.xml` and `tests/Feature/ExampleTest.php`. Shield counts tests only once there is **at least one real test besides the examples**.

1. Make sure `phpunit.xml` uses an in-memory database for tests (uncomment or add inside `<php>`):
   ```xml
   <env name="DB_CONNECTION" value="sqlite"/>
   <env name="DB_DATABASE" value=":memory:"/>
   ```
2. Add a real test for something the app does, e.g. `tests/Feature/HomePageTest.php`:
   ```php
   <?php

   namespace Tests\Feature;

   use Tests\TestCase;

   class HomePageTest extends TestCase
   {
       public function test_home_page_opens(): void
       {
           $this->get('/')->assertOk();
       }
   }
   ```
   If the app has login, add one test that a guest is redirected from a protected page (`assertRedirect('/login')`).
3. If `tests/Feature` uses `RefreshDatabase`, the in-memory SQLite above keeps the student's real database safe.
4. Run `php artisan test` and show it passes.

If the project already uses **Pest** (`pestphp/pest` in composer.json), write the test in Pest style (`it('opens the home page', fn () => $this->get('/')->assertOk());`) and keep `php artisan test`.

## CI

Copy `templates/ci/laravel.yml` to `.github/workflows/tests.yml`. Set `php-version` to the version in `composer.json` → `require.php` (e.g. `^8.2` → `'8.3'` is fine; if `composer.lock` was made on 8.4, use `'8.4'`). The file copies `.env.example` to `.env` inside CI only, so real secrets are never needed.

## Commands for CLAUDE.md
- Run: `php artisan serve` (and `npm run dev` in a second terminal if the project uses Vite)
- Test: `php artisan test`

## Secrets
- `.env` holds `APP_KEY`, DB password, mail password. Laravel's default `.gitignore` already ignores `.env`; still add the Shield lines.
- Never commit `storage/*.key` or `auth.json` (Composer tokens). The Shield lines plus Laravel defaults cover these; check `auth.json` is in `.gitignore`.

## Error monitoring (Sentry)
```bash
composer require sentry/sentry-laravel
```
Then the student runs `php artisan sentry:publish --dsn=` with their DSN **in their own terminal** (so it goes straight into `.env`, not into chat). Add `SENTRY_LARAVEL_DSN=` (empty) to `.env.example`. On shared hosting, they add the same value in the hosting `.env`.

## Database backup / rollback hints
- Before any migration on the live site: take a DB backup (cPanel → Backup Wizard / phpMyAdmin → Export; VPS: `mysqldump`).
- Undo the last migration batch: `php artisan migrate:rollback` (ask first; it can delete data in new tables).
