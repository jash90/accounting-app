# Maestro Web E2E suite

Lean post-deploy smoke tests for the accounting web app. Runs Chromium via Maestro Web (2.3.0+) against the production deployment to verify the core user flows actually work after each push.

## What this is (and is not)

- **Is**: a smoke layer. Each flow loads a page, verifies the user-visible structure rendered, and exits. Optimized for fast feedback (~30-60s per flow).
- **Is not**: a deep regression suite. The 59 Playwright specs in `apps/web-e2e/` cover that — they run in CI against `bun dev`, hit edge cases, and execute deeper UX paths. Maestro covers the parts that only show up against a real deployed build.

## Run

```bash
# All flows (recommended — wraps each in its own browser session)
./maestro/run-all.sh

# A single flow
maestro test maestro/auth/login.yaml

# Override env (defaults baked into each flow's `env:` block)
maestro test maestro/auth/login.yaml \
  -e BASE_URL=https://other-env.vercel.app \
  -e EMAIL=other@example.com \
  -e PASSWORD=othersecret

# Headless (CI)
maestro test --headless --screen-size 1280x800 maestro/auth/login.yaml
```

## Layout

```
maestro/
├── README.md                          # this file
├── config.yaml                        # workspace config (includeTags/excludeTags)
├── run-all.sh                         # runs every smoke flow in a fresh browser session
├── _helpers/
│   ├── login.yaml                     # subflow: COMPANY_OWNER login, ends on /company
│   ├── login-employee.yaml            # subflow: EMPLOYEE login, ends on /modules
│   └── login-admin.yaml               # subflow: ADMIN login, ends on /admin
├── auth/
│   ├── login.yaml                     # happy-path COMPANY_OWNER login
│   ├── login-employee.yaml            # EMPLOYEE login → /modules + employee sidebar
│   ├── login-admin.yaml               # ADMIN login → /admin + system-stats panel
│   ├── login-invalid.yaml             # 401 + Polish error rendered
│   ├── login-empty.yaml               # Zod validation: email + password length
│   └── employee-rbac-denied.yaml      # EMPLOYEE → /company/profile → /unauthorized
├── company/
│   ├── profile-nip.yaml               # avatar → "Profil" → /company/profile
│   ├── employees-list.yaml            # sidebar Pracownicy → both seeded pracownicy
│   └── employees-permissions.yaml     # WIP — icon-only buttons not tappable
└── modules/
    ├── clients-list.yaml              # sidebar Klienci → dashboard → Lista
    ├── clients-search-no-results.yaml # search bogus → "Brak wyników"
    ├── tasks-kanban.yaml              # /tasks/kanban — first 3 columns
    └── time-tracking-entries.yaml     # /time-tracking/entries — list + timer
```

## Defaults

| Setting    | Value                                             |
| ---------- | ------------------------------------------------- |
| `BASE_URL` | `https://accounting-app-prod.vercel.app`          |
| `EMAIL`    | `nowak@biuro-nowak.pl` (COMPANY_OWNER, demo seed) |
| `PASSWORD` | `Demo12345678!`                                   |

Per-role helpers default to seeded credentials matching the role:

| Role          | Helper                         | Email                       | Landing                              |
| ------------- | ------------------------------ | --------------------------- | ------------------------------------ |
| COMPANY_OWNER | `_helpers/login.yaml`          | `nowak@biuro-nowak.pl`      | `Panel Firmy`                        |
| EMPLOYEE      | `_helpers/login-employee.yaml` | `a.kowalska@biuro-nowak.pl` | `Przegląd Twojego obszaru roboczego` |
| ADMIN         | `_helpers/login-admin.yaml`    | `admin@system.com`          | `Panel Administratora`               |

All three role helpers share the same 7-step form-fill pattern. The duplication is intentional — see commit `854d4cd` for why a parameterized base does not work in Maestro 2.3.0.

The dev URL `accounting-development.vercel.app` is intentionally NOT used by default — at the time of authoring it was on a 41-day-old build. Production has the latest master (Vercel auto-promotes on push). To target dev once it's caught up, override with `-e BASE_URL=...`.

## Why prod and not dev?

Three reasons:

1. **Dev was stale**: `accounting-development.vercel.app` was pinned to a deploy 41 days behind master. Tests against it were testing yesterday's app.
2. **Read-only smoke**: every flow only navigates and asserts. No clicks that mutate state. Safe against any environment.
3. **Real-world coverage**: prod is what users actually hit. If a flow breaks there, that's a real customer-facing regression.

If you prefer to test on a per-PR Vercel preview URL, pass `-e BASE_URL=https://accounting-app-git-<branch>-jash90s-projects.vercel.app`.

## Maestro Web — gotchas captured during authoring

| Pitfall                                                                                                                                            | Workaround                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `appId:` works for mobile, **not for web**                                                                                                         | Use `url:` at top of file                                  |
| `launchUrl` is not a command                                                                                                                       | Use `- launchApp` (opens the `url:`)                       |
| `assertVisible` does NOT take `timeout:`                                                                                                           | Use `extendedWaitUntil: { visible: ..., timeout: 15000 }`  |
| `id:` matches HTML `id`, NOT `data-testid`                                                                                                         | Use visible text content; or add `id="..."` in code        |
| Maestro Web only sees viewport — content below the fold isn't visible to `assertVisible`                                                           | Either trim assertions to viewport, or `scroll` first      |
| Icon-only buttons (aria-label only) aren't matched by text                                                                                         | Tap by surrounding text or by index                        |
| Suite-level run (`maestro test maestro/`) sometimes fails on the 4th+ flow with "Unable to launch app" because browser state retains between flows | Use `./maestro/run-all.sh` which restarts maestro per flow |

## Composition principle — flows are built from blocks

**A flow MUST be composed from small, named, reusable blocks (subflows in `_helpers/`) instead of repeating step sequences inline.** Inline duplication is allowed only when (a) the sequence is unique to one flow, or (b) Maestro's runFlow constraints (below) prevent extraction.

### Why blocks

- One canonical place to update when the UI changes (e.g. login form gets a captcha → fix in 1 file, not in 12)
- Call sites read like English: `runFlow login-admin.yaml` instead of 7 lines of input/tap
- Negative-path tests (`login-invalid`, `login-empty`) and positive-path tests share the same opener, so a regression on the `Witaj ponownie` heading fails one test, not all of them silently

### Existing blocks (audit as of commit `902a2e9`)

| Block                          | Used by | Purpose                                      |
| ------------------------------ | ------- | -------------------------------------------- |
| `_helpers/login.yaml`          | 6 flows | COMPANY_OWNER login → land on `Panel Firmy`  |
| `_helpers/login-employee.yaml` | 2 flows | EMPLOYEE login → land on employee `/modules` |
| `_helpers/login-admin.yaml`    | 1 flow  | ADMIN login → land on `Panel Administratora` |

3 blocks, 9 of 12 active flows compose with them. The 3 that don't (`login.yaml`, `login-invalid.yaml`, `login-empty.yaml`) intentionally inline because they ARE the auth tests — they exercise the form directly rather than depending on a helper.

### Hard constraint — Maestro 2.3.0 does NOT propagate env vars through nested `runFlow` chains

This is the one rule that bends most cleanly-extracted abstractions. Tested empirically and committed as a permanent gotcha (see commit `854d4cd`):

```
test/auth/login.yaml      ← top level (env values resolve fine)
  └─ _helpers/login.yaml  ← runFlow subflow (env from caller works ✅)
      └─ _helpers/X.yaml  ← runFlow subflow of subflow (env arrives as literal "${EMAIL}" ❌)
```

Practical implications:

1. A block can only be one level deep when called from a test flow. Don't try to refactor 3 role helpers into 1 base helper that they all delegate to — `inputText: ${EMAIL}` in the inner-most flow will be typed literally.
2. Reusable blocks should have **complete env defaults** of their own. Top-level callers can override via the `env:` block of `runFlow:`, but the subflow must remain runnable with its own defaults if env is missing.
3. The 3 login helpers therefore each carry the same 7 form-fill steps. The duplication is documented in each file with a "MUST stay in sync" comment.

### When to extract a new block

Apply the **rule of three**: extract only after the same step sequence appears in 3+ flows AND would survive the env-propagation constraint above.

Patterns that almost qualify today (NOT yet extracted):

- "Go to clients list page" — used by `clients-list.yaml` and `clients-search-no-results.yaml` (2 callers — wait for a third)
- "Tap sidebar Pracownicy + wait for heading" — used by `employees-list.yaml` and the wip `employees-permissions.yaml` (2 callers)
- "Login + openLink to a specific module URL" — used by `tasks-kanban.yaml`, `time-tracking-entries.yaml`, `clients-search-no-results.yaml` (3 callers BUT each URL differs, and parameterizing the URL hits the env-propagation limit; so this stays inline)

When you find yourself writing the third copy of any short step sequence, stop and ask: can this be a `_helpers/<verb>-<noun>.yaml` block instead?

## Adding a new flow

Template (smoke flow for a new module):

```yaml
url: ${BASE_URL}/login
name: 'Web — <module> <action>'
tags:
  - smoke
  - <module>
env:
  BASE_URL: 'https://accounting-app-prod.vercel.app'
  EMAIL: 'nowak@biuro-nowak.pl'
  PASSWORD: 'Demo12345678!'
---
- runFlow:
    file: ../_helpers/login.yaml
    env:
      BASE_URL: ${BASE_URL}
      EMAIL: ${EMAIL}
      PASSWORD: ${PASSWORD}

- openLink: ${BASE_URL}/<module-route>

- extendedWaitUntil:
    visible: '<unique heading text>'
    timeout: 10000

- assertVisible: '<other anchor text>'
```

Workflow:

1. Open the page in Chrome DevTools, take an a11y snapshot, identify unique visible text strings
2. Write the YAML
3. `maestro check-syntax maestro/<path>.yaml` — catches typos
4. `maestro test maestro/<path>.yaml` — green or triage from `~/.maestro/tests/<timestamp>/`
5. Add to `maestro/run-all.sh` if it should run as part of the smoke suite

## Known follow-ups

- **i18n on `/unauthorized` page**: route renders English heading "Unauthorized" + "You don't have permission to access this page." — should match the rest of the app (Polish). Asserted in `auth/employee-rbac-denied.yaml` matches current English text; will need updating when localized.
- **Icon-only buttons block deeper E2E**: per-row action buttons in the employees list (`Zarządzaj uprawnieniami`, `Edytuj pracownika`, `Usuń pracownika`) and time-tracking timer (`Rozpocznij timer`) carry their label only as `aria-label`. Maestro Web's text matcher cannot tap them. Either add visible text alongside the icon, or add HTML `id="..."` attrs. Without one of those, `company/employees-permissions.yaml` stays tagged `wip`.
- **i18n on dev backend**: dev Railway backend (`api-production-02a2`) returns English error messages (`"Invalid credentials"`); prod backend correctly returns `"Nieprawidłowe dane logowania"`. Tests are written for prod's behavior.
- **Stale dev frontend**: `accounting-development` Vercel project's production alias hasn't been promoted in 41+ days. Either fix the deploy pipeline or stop calling that URL "dev".
- **Below-the-fold assertions**: several flows had to drop assertions for elements below the viewport (e.g. all 7 kanban columns, "Adres" card on profile, pagination footers). A future iteration can add `scroll` actions to verify.
- **`data-testid` not honored by Maestro Web**: existing testids on `user-menu-button`, `logout-button`, `form-error`, AI agent components are unreachable by selector. Either add HTML `id="..."` alongside, or live with text-content selectors.
