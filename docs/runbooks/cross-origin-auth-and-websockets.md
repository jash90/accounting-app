# Cross-origin auth & WebSockets

**Last incident:** 2026-04-29 — Socket.IO connections failed in production with
"WebSocket is closed before the connection is established" + 400 on the
polling fallback. Root cause and fix are captured below; same shape of
failure tends to recur every time the auth, CSP, or deploy topology changes.

---

## TL;DR

| Layer                      | What works           | What breaks                      | Why                                                                                                       |
| -------------------------- | -------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| REST (`/api/*`)            | ✅ Cookie auth       | —                                | Vercel rewrite proxies to Railway; browser sees same-origin                                               |
| WebSocket (`/socket.io/*`) | ✅ Bearer ticket     | ❌ Cookie auth                   | Vercel doesn't proxy WS upgrades; client connects directly to Railway, cross-origin → cookie cannot reach |
| Sentry                     | ✅ Workers via blob: | ❌ Without explicit `worker-src` | Browser falls back to `script-src` for workers, blocks blob:                                              |

The split-host topology (frontend on Vercel, API on Railway) is the
constraint that drives every quirk in this document.

---

## Architecture

```
                                    ┌──────────────────────────────┐
   Browser (accounting-app-prod)    │  Vercel: serves SPA + rewrite│
   ┌─────────────────────────┐      │                              │
   │ /api/auth/login   ─────►├─────►│ /api/* → Railway api         │
   │ Cookie set on Vercel host│     │                              │   ┌────────────┐
   │ (auth-app-prod.vercel.app)│    │                              │──►│ Railway api│
   └─────────────────────────┘      └──────────────────────────────┘   │            │
                                                                       │ NestJS     │
   ┌─────────────────────────┐                                         │ Socket.IO  │
   │ /socket.io upgrade ─────┼─────────────────────────────────────►   │ gateways   │
   │ Direct to Railway host  │      (Vercel cannot proxy WS upgrade)   └────────────┘
   │ NO cookie sent — Domain │
   │ mismatches              │
   └─────────────────────────┘
```

The decisive fact: **the cookie's `Domain` attribute decides which host
receives it; `SameSite` only governs cross-site behaviour for that one
host.** A cookie issued under `accounting-app-prod.vercel.app` is never
sent to `api-production-ffd9.up.railway.app` — that's a host mismatch,
not a SameSite issue. SameSite=None changes nothing.

---

## The fix — Bearer ticket via REST

We can still authenticate the WS handshake; we just can't use the cookie
directly. Instead the frontend asks the API (over the working REST path)
for a short-lived JWT and passes it as `auth.token`:

1. **Backend** (`libs/auth/src/lib/controllers/auth.controller.ts`) exposes
   `GET /api/auth/ws-token`, `JwtAuthGuard`-protected (so it requires the
   cookie that the REST path can carry).
2. **AuthService.issueWsToken** signs a 5-minute JWT with the same secret
   and payload shape as a regular access token — the gateway's
   `extractToken` already accepts `handshake.auth.token`, no gateway
   changes needed.
3. **Frontend socket contexts**
   (`apps/web/src/lib/contexts/{notification,email}-socket-context.tsx`)
   use Socket.IO's function-form `auth`, which re-runs on every connect
   and reconnect — so the token is always fresh.

```ts
return io(`${getWsBaseUrl()}/notifications`, {
  path: '/socket.io',
  auth: (cb) => {
    authApi
      .getWsToken()
      .then(({ token }) => cb({ token }))
      .catch(() => cb({ token: '' }));
  },
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
```

**Why this is safe:** the ticket is only valid for 5 minutes, never lives
in `localStorage`, never appears in server access logs (it travels in
the Engine.IO body, not the URL — Socket.IO uses `auth.token` precisely
for this), and the cookie that authorizes minting it stays `httpOnly`.

**Why we don't go back to "token in localStorage":** that was the
pre-2026-04-13 setup (commit `7921c56`). XSS-readable. Off the table.

---

## Verifying the fix in production

Run these in order. Each step is non-destructive.

```bash
# 1. Backend deployment is current
railway link --project <prod-project-id>           # accounting prod
railway status --json | jq '.services.edges[].node | select(.name=="api")
  | .serviceInstances.edges[0].node.latestDeployment.meta'
# Expect commitMessage to mention `b931372` or later — Bearer ticket commit.

# 2. Endpoint is mapped
railway logs --service api --lines 500 \
  | grep "Mapped {/api/auth/ws-token, GET}"
# Expect: one line at boot.

# 3. Migration is applied
railway connect Postgres -e production
> SELECT name FROM typeorm_migrations
  WHERE name='AddRefreshTokensTable1773500000000';
> SELECT EXISTS (SELECT FROM pg_tables WHERE tablename='refresh_tokens');
# Expect: row present, exists=t.

# 4. CORS_ORIGINS includes the actual frontend host
railway variables --service api | grep CORS_ORIGINS
# Expect: comma-separated list including https://<your-vercel-host>

# 5. End-to-end probe (no auth → 401, not 404 or 5xx)
curl -i -H "Origin: https://accounting-app-prod.vercel.app" \
  https://api-production-ffd9.up.railway.app/api/auth/ws-token
# Expect: HTTP/2 401, with
#   access-control-allow-origin: https://accounting-app-prod.vercel.app
#   access-control-allow-credentials: true

# 6. Healthcheck still works (regression check for P1-13 CORS guard)
curl -i https://api-production-ffd9.up.railway.app/api/health
# Expect: 200 OK with no Origin header on the request.
```

Browser-side, after a fresh login:

```js
// Paste into DevTools → Console on /inbox
fetch('/api/auth/ws-token', { credentials: 'include' })
  .then((r) => r.json())
  .then(({ token }) =>
    console.log('len=', token.length, 'payload=', JSON.parse(atob(token.split('.')[1])))
  );
// Expect: len > 200, payload has { sub, email, role, companyId, exp }
// exp - iat should be 300 (5 minutes)
```

---

## Diagnostic checklist when WS breaks again

Tick from top to bottom; stop at the first red.

1. **Vercel deployed the latest frontend?**
   Hard-refresh; check the bundle hash changed. CSP and `VITE_API_URL` are
   build-time, so they only update with a new deploy.

2. **`VITE_API_URL` set in Vercel project settings?**
   Without it, `getWsBaseUrl()` returns `''` and Socket.IO connects to the
   Vercel host, which has no WS server. Symptom: 404 / connection reset on
   `/socket.io/` against the Vercel host.

3. **Railway deployed the latest backend?**
   `railway status --json` → look at `latestDeployment.meta.commitHash`.
   Railway can take 5–7 min after a `git push`. Symptom: 404 on
   `/api/auth/ws-token`.

4. **Migration ran on Railway?**
   `psql` query above. Without `refresh_tokens` table, login itself
   returns **500** (`relation "refresh_tokens" does not exist` in
   `AuthService.generateTokens`). Symptom: login broken, never reaches
   the WS step.

5. **`CORS_ORIGINS` on Railway includes the exact frontend host?**
   Both `apex` and any preview/wildcard domain that needs WS. Missing it
   ⇒ the WS handshake fails on the CORS check before the gateway ever
   runs `extractToken`. Symptom: WS failure with no
   `Mapped`/`connection rejected` line in Railway logs.

6. **CSP allows the WS endpoint?**
   `connect-src` must include `wss://api-production-ffd9.up.railway.app`
   in **both** `vercel.json` and the meta tag in `apps/web/index.html`.
   The browser applies the intersection. Symptom: console
   `Refused to connect ... violates CSP "connect-src ..."`.

7. **CSP allows Sentry workers / regional ingest?**
   `worker-src 'self' blob:` and `https://*.sentry.io` in connect-src
   (covers regional `*.ingest.us.sentry.io` etc.). Sentry is unrelated to
   WS but its CSP errors share the console with WS errors and confuse
   triage.

8. **Cookies actually issued correctly?**
   DevTools → Application → Cookies → check `access_token` row:
   - `Secure` ✓
   - `HttpOnly` ✓
   - `SameSite` = `None` (production) — set in
     `libs/auth/src/lib/utils/cookie-options.ts`. With `Strict` even REST
     can break in some flows.
   - `Domain` = `accounting-app-prod.vercel.app` (this is correct — they
     are stored on the Vercel host because login goes through the rewrite).
     They are **not** going to be on Railway's domain. That's the whole
     reason for the Bearer ticket.

9. **`JWT_EXPIRES_IN` matches the frontend silent-refresh schedule?**
   `client.ts` hardcodes 15 min (P1-3). If Railway env has `1h`, the
   silent refresh fires too early — annoying, not breaking. Aligning to
   `15m` on Railway is the recommendation.

10. **Multi-replica?**
    `railway service status` → if `replicas > 1`, Socket.IO with
    polling+upgrade needs a sticky LB or a Redis adapter
    (`@socket.io/redis-adapter`) so the upgrade hits the same pod that
    issued the `sid`. Symptom: 400 on polling poll-with-sid right after
    a successful initial poll. Out of scope today (we run a single
    replica), but file this if the deploy ever scales.

11. **Browser extension noise?**
    Perplexity/Grammarly/etc. inject overlays and trip our CSP for their
    own resources. Errors will name the extension's CDN
    (`frontend-cdn.perplexity.ai`, etc.). Ignore — adding those to CSP
    would weaken our policy for someone else's product.

---

## Why cookie-only auth would never have worked here

It's worth writing this down explicitly so future temptation to "just
fix the cookie" gets nipped early.

For the browser to send a cookie on a request, two things must be true:

- **The request URL host matches the cookie's `Domain` attribute** (or the
  cookie was set without `Domain`, i.e. host-only — same idea, the
  exact host).
- The cookie's `SameSite` and `Secure` rules don't disqualify it for
  this particular request (cross-site, top-level navigation, etc.).

`SameSite` is a _policy on top of_ the host match — it never expands the
set of hosts that receive the cookie. A cookie set under
`accounting-app-prod.vercel.app` is fundamentally not eligible to be
sent to `api-production-ffd9.up.railway.app`. There is no value of
`SameSite` that changes this.

To fix it at the cookie layer you'd need one of:

- A custom domain spanning both (e.g. `app.example.com` and
  `api.example.com`, with `Domain=.example.com` on the cookie). Possible,
  but a DNS + TLS project.
- Two separate logins — one against Vercel, one against Railway —
  which is two cookies, two refreshes, double the surface, and breaks
  the SPA-feeling.

The Bearer ticket avoids the entire question by choosing a transport
that carries the credential explicitly. It's deliberately a JWT (not a
random opaque ticket) so the gateway's existing `extractToken` +
`verifyToken` chain works without a second token store.

---

## Companion fixes shipped with this incident

These were touched while debugging; they're independent improvements
worth knowing about so you don't undo them accidentally.

| Commit                                   | Area    | What                                                                                                                   |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `c6ba5e6`                                | cookies | `SameSite='none'` in production for cross-origin REST flows that DO go through Vercel rewrite                          |
| `983f865`                                | CORS    | Allow missing-Origin only on safe methods (`GET`/`HEAD`/`OPTIONS`) so Railway healthcheck (no Origin) stops 5xx-ing    |
| `a37800b` + `4017d95`                    | CSP     | Explicit `worker-src 'self' blob:` in `vercel.json` AND `apps/web/index.html` (browser applies intersection)           |
| `55a6f6d`                                | CSP     | `https://*.sentry.io` instead of `https://*.ingest.sentry.io` to cover regional ingest hosts (`*.ingest.us.sentry.io`) |
| `b931372`                                | WS auth | The Bearer ticket implementation described above                                                                       |
| `1773500000000-AddRefreshTokensTable.ts` | DB      | Required for `b931372` and the wider P0-3 refresh-rotation work; must run on every environment                         |

---

## When this entire model needs to change

Move both frontend and API to a shared parent domain
(`app.example.com` + `api.example.com` under `example.com`) and you can
collapse this back to plain cookies for both REST and WS by setting
`Domain=.example.com` on the cookies. At that point `b931372` becomes
dead code and you can delete `/api/auth/ws-token` plus the
`auth: (cb) => …` indirection in the socket contexts. Don't do this
unless you actually own a shared parent domain — Railway/Vercel default
domains do not satisfy the requirement.

Until then: keep the Bearer ticket. It's the smallest correct thing for
a split-host SPA + API.
