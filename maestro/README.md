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
├── README.md                      # this file
├── config.yaml                    # workspace config (includeTags/excludeTags)
├── run-all.sh                     # runs every smoke flow in a fresh browser session
├── _helpers/
│   └── login.yaml                 # subflow: COMPANY_OWNER login, ends on dashboard
├── auth/
│   ├── login.yaml                 # happy-path login
│   └── login-invalid.yaml         # 401 + Polish error rendered
├── company/
│   └── profile-nip.yaml           # avatar → "Profil" → /company/profile renders
└── modules/
    ├── clients-list.yaml          # sidebar Klienci → dashboard → Lista klientów
    ├── tasks-kanban.yaml          # /tasks/kanban — first 3 columns visible
    └── time-tracking-entries.yaml # /time-tracking/entries — list + timer widget
```

## Defaults

| Setting    | Value                                             |
| ---------- | ------------------------------------------------- |
| `BASE_URL` | `https://accounting-app-prod.vercel.app`          |
| `EMAIL`    | `nowak@biuro-nowak.pl` (COMPANY_OWNER, demo seed) |
| `PASSWORD` | `Demo12345678!`                                   |

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

- **i18n on dev backend**: dev Railway backend (`api-production-02a2`) returns English error messages (`"Invalid credentials"`); prod backend correctly returns `"Nieprawidłowe dane logowania"`. Tests are written for prod's behavior.
- **Stale dev frontend**: `accounting-development` Vercel project's production alias hasn't been promoted in 41+ days. Either fix the deploy pipeline or stop calling that URL "dev".
- **Below-the-fold assertions**: several flows had to drop assertions for elements below the viewport (e.g. all 7 kanban columns, "Adres" card on profile, pagination footers). A future iteration can add `scroll` actions to verify.
- **`data-testid` not honored by Maestro Web**: existing testids on `user-menu-button`, `logout-button`, `form-error`, AI agent components are unreachable by selector. Either add HTML `id="..."` alongside, or live with text-content selectors.
