# Django / Python

Needs Python 3.10+ (`python3 --version`, on Windows `py --version`). If missing: python.org → Downloads → install; on Windows tick **"Add Python to PATH"**.

## Virtual environment (keeps project packages separate)

```bash
python3 -m venv .venv
```
Windows: `py -m venv .venv`. Then use the venv's Python directly so no "activate" step is needed:
- macOS/Linux: `.venv/bin/python`, `.venv/bin/pip`
- Windows: `.venv\Scripts\python`, `.venv\Scripts\pip`

Add to `.gitignore` (if missing): `.venv/`, `__pycache__/`, `*.pyc`, `db.sqlite3`, `media/`, `staticfiles/`.

## New project

```bash
.venv/bin/pip install django
.venv/bin/python -m django startproject config .
```
(The trailing `.` creates it in the current folder; works with existing Shield files.) Create a first app if needed: `.venv/bin/python manage.py startapp core`.

## Move the secret key out of settings.py

Django puts a real `SECRET_KEY` and `DEBUG = True` in `settings.py`. Change to read from the environment:
```python
import os

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-only-not-secret-change-me')
DEBUG = os.environ.get('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
```
Add `DJANGO_SECRET_KEY=`, `DEBUG=True`, `ALLOWED_HOSTS=` to `.env.example`. Explain: the real key is set only on the live server.

## Tests with pytest

```bash
.venv/bin/pip install pytest pytest-django
```
`pytest.ini`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
```
(Use the project's real settings module name.)

First test, e.g. `core/tests/test_pages.py` (create `core/tests/__init__.py`), or `tests/test_smoke.py` if there is no app yet:
```python
import pytest


@pytest.mark.django_db
def test_admin_login_page_opens(client):
    response = client.get('/admin/login/')
    assert response.status_code == 200
```
Once the app has its own home page, add a test for it too (`client.get('/')` → 200). Note: in tests `DEBUG` is off, so a fresh project without its own URLs returns 404 for `/`. Run `.venv/bin/pytest`.

Write `requirements.txt` with what is installed (`.venv/bin/pip freeze > requirements.txt`) so CI and hosting install the same versions.

## CI

Copy `templates/ci/django.yml` to `.github/workflows/tests.yml`. Match `python-version` to the student's Python (3.12 is a safe default). If the project uses `pyproject.toml` with Poetry/uv instead of `requirements.txt`, change the install step.

## Commands for CLAUDE.md
- Run: `.venv/bin/python manage.py runserver` → http://127.0.0.1:8000 (Windows: `.venv\Scripts\python manage.py runserver`)
- Test: `.venv/bin/pytest`

## Error monitoring (Sentry)
```bash
.venv/bin/pip install sentry-sdk
```
In `settings.py`:
```python
import sentry_sdk

if os.environ.get('SENTRY_DSN'):
    sentry_sdk.init(dsn=os.environ['SENTRY_DSN'])
```
Add `SENTRY_DSN=` to `.env.example`; the student sets the real value on the server. Update `requirements.txt`.

## Database backup / rollback hints
- SQLite: copy `db.sqlite3` before risky changes. Postgres/MySQL: hosting backup or `pg_dump` / `mysqldump`.
- Undo a migration: `python manage.py migrate <app> <previous_migration>` (ask first).
