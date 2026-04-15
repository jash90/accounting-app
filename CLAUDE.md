# CLAUDE.md

This file provides Claude Code–specific guidance. All shared rules are in `AGENTS.md` — this file only contains Claude-specific or supplementary information.

## Dev Environment (Portless)

`bun dev` runs both API and web through [portless](https://github.com/nicolo-ribaudo/portless), which replaces random ports with stable `.localhost` URLs:

| Service | URL                                    |
| ------- | -------------------------------------- |
| API     | `http://api.accounting.localhost:1355` |
| Web     | `http://web.accounting.localhost:1355` |

**Setup** (one-time):

```bash
npm install -g portless
portless proxy start          # start daemon on port 1355
portless trust                # optional: HTTPS
portless hosts sync           # optional: fix Safari .localhost
```

**If portless proxy is not running**, `bun dev` will fail. Start it with `portless proxy start`.

**Override API URL**: set `API_URL` env var before `bun dev` — Vite's proxy uses `process.env.API_URL` as fallback.

## Known Issues

- Backend tests: use `bun run test` (package.json script) — all passing. Running bare `bun test` without args picks up frontend specs and fails.
- Frontend typecheck: clean (`tsc --noEmit` passes).
- NX serve + webpack: `dist/apps/api/main.js` hot-reload may not auto-trigger on `libs/` changes.
- 65 migration files — consider squashing old ones into a baseline when stable.
