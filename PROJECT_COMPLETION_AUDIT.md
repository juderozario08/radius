# Radius: Project Completion Audit

This is the single list of work left before Radius can be called complete. It was written for any model or agent, so every item names the files involved, the problem, and why it matters. Work through it top to bottom, tick items off, and keep this file current.

| | |
|---|---|
| **Audit date** | 2026-10-06 |
| **Last verified** | 2026-10-07. P0 pricing source and provincial tax rates were corrected. P1 work now includes refresh rotation, print-order transitions, client response handling, cleanup, and partial release/CI improvements. P0 S2 money-type migration, S8 frontend advisories, and the S6 compose follow-up remain open. |
| **Owner decisions** | POS checkout is out of scope. Only `ADMIN` may create transactions (F2, S2). Push notifications are deferred (F3). |
| **Baseline commit** | `30f4051` on `main` after the P0 push; the route-stub cleanup is in `98edd97`. |
| **Knowledge graph** | `graphify-out/graph.json`, rebuilt the same day: 2,725 nodes, 6,323 edges, 282 communities, no import cycles |
| **Out of scope** | Push notifications. The owner deferred them; they are listed under F3 only so the list is complete. |
| **Supersedes** | `PROJECT_REMAINING_WORK.md`, which was high-level, and the stale parts of `CACHING_OPTIMIZATIONS.md` and `tasks.md` (see DOC2) |

## How this audit was produced

All of these were actually run, so the findings come from tool output and source reading, not guesses:

- `graphify` full rebuild, then graph queries (god nodes, communities, `explain`)
- Backend: `gofmt -l`, `go vet ./...`, `go test ./...`, `go test -coverprofile`, `govulncheck ./...`
- Frontend: `npx tsc --noEmit`, `npx expo lint`, `npm audit --omit=dev`, `npx expo-doctor`
- GitHub Actions history (`gh run list` / `gh run view --log-failed`)
- Manual review of the router, middleware, config, `main.go`, services, repositories, migrations, the seed pipeline, the API client, auth storage and app config

**Rules for whoever works this list** (from `AGENTS.md`): never drop the `stores` or `employees` tables; schema changes go through `golang-migrate` files only; no unnecessary comments; reuse `src/constants/colors.ts` and `styles.ts`; plain `fetch`, no state libraries; run `graphify query` before broad architecture changes.

---

## Status legend and priority

- `[ ]` open · `[x]` done · `[~]` in progress
- **P0**: must fix before any real deployment (security or data integrity)
- **P1**: needed to call the project complete
- **P2**: quality and maintainability; do after P0 and P1

Implementation note (2026-10-07): P0 hardening has been applied and verified with backend tests/build/vet, frontend typecheck/tests/lint, `git diff --check`, `govulncheck`, Expo dependency checks, and a refreshed knowledge graph. S2 remains partial until the public money fields are migrated from floating point to integer cents/decimal end to end; POS server arithmetic now uses cents and ignores client-supplied prices and totals.

## Summary

| Area | P0 | P1 | P2 |
|---|---|---|---|
| Security | 8 | 7 | 0 |
| Unbuilt features | 0 | 1 (F2 descoped) | 0 |
| Reliability and CI | 1 | 5 | 0 |
| Testing | 0 | 3 | 0 |
| Code quality and best practices | 0 | 2 | 14 |
| Release and deployment | 0 | 4 | 1 |
| Documentation | 0 | 1 | 3 |

---

## 1. Security

### P0

#### [x] S1: Cross-store access to online and print orders (IDOR)

**Files**
- `radius-backend/internal/service/online_order_service.go`:
  - `GetOnlineOrderByID` (L82)
  - `UpdateOrderItem` (L257)
  - `CompleteOrderPicking` (L261)
  - `CancelOnlineOrder` (L312)
  - `CreateOnlineOrder` (L157–167)
- `radius-backend/internal/service/print_order_service.go`: `GetPrintOrderByID` (L38) calls the repo with `storeID = nil`
- `radius-backend/internal/handler/online_order_handler.go` and `print_order_handler.go`: they pass `email`, not `storeId`

**Issue**
- These methods look up an order by numeric ID and never check that it belongs to the caller's store.
- `UpdateOrderItem`, `CompleteOrderPicking` and `CancelOnlineOrder` take `email` and `role` but never use them for scoping.
- Any `SALES` user at store 3 can read, pick, or cancel orders at store 5 by changing the ID in the URL. Read access also exposes customer names, emails and phone numbers.
- `CreateOnlineOrder` only defaults `order.StoreId` when the client leaves it out. A client can send any `store_id` and choose the initial `Status`.

**Why it matters**
- It's a textbook broken-object-level-authorization flaw (OWASP API #1), and it leaks customer PII across stores.
- The same pattern is done correctly elsewhere: `ReturnsService.ApproveReturn` (L173) checks `retSummary.StoreId != storeId`, and `TransferService` checks `FromStoreId`. Copy that pattern.

**Fix**
1. Pass `storeId` and `role` into every by-ID read and write.
2. Use `storeID` filtering in the repo (`GetPrintOrderByID` already accepts it), or load the row and compare `StoreId` unless the caller is `ADMIN`.
3. In `CreateOnlineOrder`, only `ADMIN` may set `StoreId`. Ignore a client-sent `Status`.
4. Add table-driven tests for cross-store denial.

#### [~] S2: POS transactions trust client-supplied prices and totals; money is `float32`

**Status (verified 2026-10-07)**
- **Decision:** POS checkout is out of scope (see F2). Creating a transaction is now **ADMIN-only**, enforced twice:
  - Route: `POST /api/sales_floor/transactions` and `/create` sit in the `adminActions` group with `PermViewAdminActions` (`router.go`).
  - Service: `TransactionService.CreateTransaction` returns `ErrForbidden` for any other role; the handler maps it to 403.
  - Tests: `TestTransactionService_CreateTransaction_NonAdminForbidden` and `TestTransactionHandler_CreateTransaction_NonAdminGets403`.
- **Done:** price and total fields are `json:"-"` in `models/sales.go`, so the client can no longer set them.
- **Fixed 2026-10-07:** Admin-created sales now read `products.retail_price` and primary-supplier `product_suppliers.cost_price`, reject zero/invalid values, and compute tax with integer rates in `internal/utils/canada.go`.
- The current combined sales-tax rates used for this fix are:

  | Province(s) | Rate |
  |---|---|
  | ON | 13% |
  | NB, NL, PEI | 15% |
  | NS | 14% |
  | BC, MB | 12% |
  | SK | 11% |
  | QC | 14.975% |
  | AB and territories | 5% |

  `Features.md` itself says BC is 12%; the code charges BC 5%.
- **Still open:** public money fields are still `float32`; an end-to-end cents/decimal migration is needed before closing S2.
- **Lower severity now:** with the endpoint admin-only, this is no longer a staff price-tampering hole. It's a correctness bug for the rare admin-created transaction.

**Files**
- `radius-backend/internal/models/sales.go` L82–106 (`CreateTransactionItemRequest`, `CreateTransactionRequest`)
- `radius-backend/internal/service/transaction_service.go` L50
- `radius-backend/internal/repository/sales_repo.go` L40–75
- Money fields across `radius-backend/internal/models/*.go`: 60 `float32`/`float64` fields named price, cost, amount, total, subtotal, tax, msrp or refund

**Issue**
- `UnitPrice`, `UnitCost`, `DiscountAmount`, `Subtotal`, `TaxAmount`, `CostTotal` and `TotalAmount` are all taken from the request body and written as-is.
- The server never recomputes them from `products` or the store's province tax rate.
- Postgres stores money as `DECIMAL(10,2)`, but Go carries it as `float32`, which has only about 7 significant digits and binary rounding.

**Why it matters**
- Any authenticated sales user can record a $2,000 laptop sale at $0.01. That corrupts revenue, margin, and the fill-report sales velocity that reads these rows.
- `float32` rounding produces off-by-a-cent totals and tax.

**Fix**
1. Accept only `product_id`, `quantity`, an optional discount code, and payment info.
2. Look up price and cost on the server, compute tax with `internal/utils/canada.go`, and compute totals inside the DB transaction.
3. Move money to integer cents (`int64`) or a decimal type (e.g. `shopspring/decimal`) end to end, frontend types included.
4. Read `retail_price` and the primary supplier's `cost_price` instead of `default_price`/`default_cost`, move the tax table into `internal/utils/canada.go`, and add a repository test so a $0 total can't slip through again.

#### [x] S3: `/metrics` is public

**Files**
- `radius-backend/internal/router/router.go` L93–96
- `radius-backend/internal/handler/metrics_handler.go`

**Issue**
- `/metrics` and `/api/v1/metrics` sit in the `public` group.
- They return the Postgres pool stats, Redis health and latency, and cache hit and miss counts to anyone.

**Why it matters**
- It gives an attacker free reconnaissance (load, saturation, whether Redis is down).
- Polling it is also an unauthenticated way to generate DB and Redis work.

**Fix**
- Put it behind `RequireAuth` plus `PermViewAdminActions`, or a separate scrape token or internal-only port.
- Keep `/health` public but minimal.

#### [x] S4: Rate limiting can be bypassed, and login has no brute-force protection

**Files**
- `radius-backend/internal/router/router.go` L57–60
- `radius-backend/internal/middleware/rate_limit.go`
- `radius-backend/internal/service/auth_service.go` `Login` (L59)

**Issue**
1. The engine is created with `gin.Default()` and `SetTrustedProxies` is never called, so Gin trusts every proxy. `c.ClientIP()` then reads the client-controlled `X-Forwarded-For` header. A new fake IP per request gets a fresh limiter, which bypasses rate limiting entirely.
2. The only limit is a global 5 req/s, burst 20, per IP. Login gets no tighter limit and there is no per-account lockout or backoff, so about 400k password guesses per day per IP are allowed.
3. The limiter is in-memory, so it doesn't apply across multiple API instances.

**Why it matters**
- Credential stuffing against employee accounts is the most likely real-world attack on this API.

**Fix**
1. Call `router.SetTrustedProxies([...])` with your load balancer's CIDRs, or `nil` when there is no proxy. On Render or a similar host, use `TrustedPlatform`.
2. Add a strict limiter for `/login` and `/api/refresh_token`, e.g. 5/min per IP plus per email.
3. Add per-account failed-attempt counters in Redis with temporary lockout.
4. Consider a Redis-backed limiter for multi-instance deployments.

#### [x] S5: No HTTP server timeouts and no request body size limit

**Files**
- `radius-backend/cmd/api/main.go` L143–146: `http.Server{Addr, Handler}` only
- Every `ShouldBindJSON` call in `radius-backend/internal/handler/*.go`

**Issue**
- `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout` and `IdleTimeout` are all unset.
- There is no `http.MaxBytesReader` or middleware limit on request bodies.

**Why it matters**
- Slowloris-style connections can exhaust the server.
- A multi-MB JSON body is parsed fully into memory.
- `gosec` flags this pattern as G112.

**Fix**
- Set `ReadHeaderTimeout: 5s`, `ReadTimeout: 15s`, `WriteTimeout: 30s` and `IdleTimeout: 60s`. WebSocket upgrades hijack the connection, so they are not affected by `WriteTimeout`.
- Add a body-limit middleware, e.g. 1 MB, as one `router.Use(...)`.

#### [x] S6: Insecure defaults in `docker-compose.yml`

**Files**
- `docker-compose.yml`
- `radius-backend/.env.example`

**Issue**
- `JWT_SECRET_KEY`, the DB user and the DB password are hardcoded in a tracked file.
- `GIN_MODE=debug` and `ALLOWED_ORIGINS=*` are set.
- Postgres (`5432`) and Redis (`6379`, no password) are published on every host interface.

**Why it matters**
- If this compose file is ever used on a server, the JWT signing key is public, so anyone can mint ADMIN tokens.
- Redis also becomes reachable without auth.
- Even when used locally only, people copy it as the deploy template.

**Fix**
1. Read secrets from an untracked `.env` (`env_file:`) or `${VAR:?required}` interpolation.
2. Bind DB and Redis to `127.0.0.1:` or drop `ports:`.
3. Set a Redis password.
4. Label the file "local development only" in the README.
5. Rotate the JWT secret if this value was ever used anywhere real.

**Status (verified 2026-10-07):** The security fix is done: no secrets in tracked files, ports bound to `127.0.0.1`, and Redis has a password.

**Follow-up:** `docker compose up` won't start as-is.
- `env_file: .env` and the `${VAR:?}` interpolation read a **root** `.env` that doesn't exist. The only example is `radius-backend/.env.example`.
- That example uses `localhost` hosts. Inside compose, the API container needs `postgres:5432` and `redis:6379`.
- Fix: add a root `.env.example` with the container hostnames, or document the setup.

#### [x] S7: The seed pipeline can wipe the database and has no production guard

**Files**
- `radius-backend/cmd/seeds/main.go` (L29–36)
- `radius-backend/seeds/00_wipe_database.py`
- `radius-backend/Dockerfile` (it builds and ships `/app/bin/seeds`)

**Issue**
- `00_wipe_database.py` truncates all business tables: products, inventory, transactions, orders, POs, transfers, cycle counts and audit ledger. Only `stores` and `employees` are kept.
- Nothing checks `GIN_MODE`, an environment name, or an explicit confirmation flag before running against whatever `DATABASE_URL` is set.
- The seeds binary is included in the production image.

**Why it matters**
- One mistaken `docker exec ... /app/bin/seeds` against production destroys every business record, including the immutable `inventory_transactions` ledger.

**Fix**
1. Refuse to run when `GIN_MODE=release`, and require an explicit `--i-understand-this-wipes-data` flag or `ALLOW_SEED_WIPE=true`.
2. Drop `seeds` from the production image (see D3).

#### [~] S8: Known-vulnerable dependencies

**Status (verified 2026-10-07)**
- Backend done: Go 1.26.6 and `x/text v0.39.0`; `govulncheck` reports 0 reachable vulnerabilities.
- Frontend remains open: Expo SDK 54 dependency checks pass. A non-forced `npm audit fix` removed the critical advisory, but `npm audit --omit=dev` still reports 60 advisories (42 high, 18 moderate), largely in Expo/Jest build tooling. Review without `npm audit fix --force`.

**Files**
- `radius-backend/go.mod` (`go 1.26.3`, `golang.org/x/text v0.38.0`)
- `radius-frontend/package.json` and `package-lock.json`

**Issue**
- `govulncheck` reports **8 vulnerabilities your code actually reaches**: crypto/tls, net/http, crypto/x509, encoding/asn1, net/textproto and encoding/xml in Go 1.26.3, plus `x/text`. Go 1.26.6 and `x/text v0.39.0` fix them.
- `npm audit` reports 47 advisories (1 critical, 30 high), mostly in transitive build and CLI tooling (e.g. `shell-quote`, critical).

**Why it matters**
- The `net/http` and `crypto/tls` issues are in the code path that serves every request.

**Fix**
1. Bump the toolchain to Go 1.26.6 (the `go` directive or a `toolchain` line, the Dockerfile `FROM golang:1.26.6-alpine`, and CI).
2. Run `go get golang.org/x/text@v0.39.0 && go mod tidy`, then re-run `govulncheck ./...` until clean.
3. On the frontend, run `npx expo install --check` to move to the latest SDK 54 patch versions.
4. **Do NOT run `npm audit fix --force`**: it proposes downgrading `expo` to v44 and `react-native` to an unrelated major version.
5. Re-audit afterwards and record any remaining advisories that are build-time only.

### P1

#### [x] S9: Refresh tokens are never rotated

**Status (2026-10-07):** Refreshes atomically replace both token hashes, issue a unique new refresh token, and record the spent hash in Redis. Reuse revokes the session. The client saves the replacement token. Service tests cover rotation and replay.

**Files**
- `radius-backend/internal/service/auth_service.go` `RefreshToken` (L116–121)
- `radius-backend/internal/service/session_service.go` `RefreshAccessToken`
- `radius-backend/internal/utils/jwt.go` (`MaxSessionLifetime = 7d`)
- `radius-frontend/src/api/client.ts` L55–92

**Issue**
- A refresh returns only a new access token. The same refresh token stays valid for its whole 7-day life.
- There is no reuse detection.

**Why it matters**
- A refresh token stolen from a lost or shared store device works for a week, and replay can't be detected.

**Fix**
1. Issue a new refresh token on every refresh and store only its hash in the session row.
2. Invalidate the old one. If an old refresh token is presented again, revoke the whole session.
3. Have the frontend save the new refresh token (`saveRefreshToken`).

#### [x] S10: Internal error text sent to clients; status codes chosen by string matching

**Files**
- **500s that echo `err.Error()`**:
  - `internal/handler/cycle_count_handler.go` L39, 74, 110, 132, 162, 192, 222, 251, 287, 310, 334
  - `internal/handler/inventory_handler.go` L231
  - `internal/handler/online_order_handler.go` L125
  - `internal/handler/transaction_handler.go` L38
  - 80 `Error: err.Error()` responses in total across `internal/handler/`
- **String matching**: `internal/handler/cycle_count_handler.go` L69, 105, 159 and others (11 `strings.Contains(err.Error(), ...)` sites)

**Issue**
- Raw driver and SQL errors (constraint names, column names, pgx messages) reach clients.
- HTTP status is picked by matching substrings such as `"unauthorized"` and `"not found"`. There are zero `errors.Is`/`errors.As` uses or sentinel errors in non-test code.
- So authorization failures from services often surface as 400 or 500 instead of 403.

**Why it matters**
- It leaks schema details.
- Rewording an error message silently changes the status code.
- Clients can't tell a forbidden request from a bad one.

**Fix**
1. Define sentinel or typed errors in `internal/service` (`ErrForbidden`, `ErrNotFound`, `ErrConflict`, `ErrValidation`).
2. Wrap them with `%w`.
3. Add one helper in `internal/api/response.go` that maps them to 403, 404, 409 and 400, and logs plus returns a generic message for anything else (500).

#### [x] S11: WebSocket ticket is fetched and deleted non-atomically

**File:** `radius-backend/internal/handler/ws_handler.go` L155 (`Get`) and L162 (`Del`)

**Issue:** Two concurrent upgrade requests with the same ticket can both `GET` it before either `DEL` runs.

**Why it matters:** Tickets are meant to be single-use.

**Fix:** Use `GETDEL` (`h.redisClient.GetDel`).

#### [x] S12: Login timing reveals which emails exist

**File:** `radius-backend/internal/service/auth_service.go` L65–70

**Issue:** When the email doesn't exist, the function returns before running bcrypt. For a real email it runs bcrypt (about 50–100 ms), so response time tells an attacker which emails are valid.

**Why it matters:** Attackers can enumerate employee emails, which then feeds S4.

**Fix:** Run `bcrypt.CompareHashAndPassword` against a fixed dummy hash when the user isn't found.

#### [x] S13: No security response headers

**Files:** `radius-backend/internal/router/router.go`, which has no headers middleware

**Issue:** `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (behind TLS), `Cache-Control: no-store` on auth responses and `Referrer-Policy` are all missing.

**Why it matters:** These are standard baseline hardening, and audit and pentest checklists flag their absence.

**Fix:** Add a small middleware.

#### [x] S14: `Audit.tsx` bypasses the API client

**File:** `radius-frontend/app/(app)/(tabs)/home/actions/sales_floor/Audit.tsx` L54–62

**Issue**
- It uses raw `fetch` with a manually built URL and the stored token.
- On 401 it never refreshes the token or logs the user out.
- `barcode`, `filterStoreId` and `filterTxnType` are put into the query string without `encodeURIComponent`, so a value containing `&store_id=...` injects extra parameters.

**Why it matters**
- The screen breaks every 15 minutes when the access token expires.
- It is the only screen not covered by the client's refresh, ETag and error handling.

**Fix**
- Use `callApi` or `apiFetch`.
- Build the query with `URLSearchParams`.
- Add a builder in `ENDPOINTS` (`radius-frontend/src/constants/routes.ts`).

#### [x] S15: Authorization lives only inside services, and route permissions are coarse

**Files**
- `radius-backend/internal/middleware/roles.go`: `PermViewBackRoomActions` (L15) and `PermViewServiceActions` (L16) are defined but never used
- `radius-backend/internal/router/router.go` L169–316

**Issue**
- Every `/api/sales_floor/*` route, including approve, reject, dispatch, create-transfer, schedule and review-adjustments, is gated only by `PermViewSalesFloorAction`, which `SALES` has.
- Manager-only checks exist, but only as `if role != RoleManager && role != RoleAdmin` lines repeated inside each service. This was verified for cycle-count approve, schedule and ownership transfer; returns approve and reject; adjustment review; and transfer create, dispatch and cancel.
- S1 shows what happens when one of those lines is forgotten.

**Why it matters**
- Defense in depth: one forgotten `if` in a service exposes a privileged action.
- The route table doesn't document who can call what.

**Fix**
1. Add route-level `RequirePermission` for manager actions (approve, reject, review, dispatch, cancel, schedule, transfer create).
2. Use or delete the unused permissions.
3. Add a router test that walks a role × route matrix and checks 403s.

---

## 2. Unbuilt features

> Correction to an earlier verbal answer: two features besides notifications are not done.

#### [x] F1: Print order lifecycle (status updates). P1

**Status (2026-10-07):** Added store-scoped, role-gated status updates with conditional SQL, valid-transition checks, a store WebSocket event, mobile action buttons, and service transition tests.

**Files**
- Backend: `radius-backend/internal/repository/orders_repo.go` only has `GetAllPrintOrders` (L321) and `GetPrintOrderByID` (L429). There is no create or update method, and `router.go` L206–208 only registers GETs.
- Frontend: `radius-frontend/app/(app)/(tabs)/home/actions/service/PrintOrders/[id].tsx` shows status only.

**Issue**
- `Features.md` §11 promises "Production Status Tracking: Submitted → In Production → Ready for Pickup → Completed / Cancelled".
- Nothing in the app can change a print order's status. `tasks.md` lists this as "Partial (~60%)".

**Why it matters:** The print and copy center's core workflow can't be done in the app.

**Fix**
1. Add `PUT /api/sales_floor/orders/print/:id/status` with an allowed-transition table, store scoping (see S1) and the `SERVICE`/`MANAGER`/`ADMIN` roles.
2. Add a WebSocket event like the online orders have.
3. Add status action buttons on `PrintOrders/[id].tsx`.
4. Add service tests.

#### [x] F2: Mobile POS checkout. DESCOPED by the owner (2026-10-07)

**Decision:** Radius does not do POS checkout. **Do not build a checkout flow.**
- Only `ADMIN` may create a transaction (an occasional manual entry). No other role may have any path to create one; see S2 for how that's enforced.
- Transaction **viewing** stays available to all roles (`sales_floor/Transactions/`).

**Remaining doc cleanup:** `README.md` (the POS bullet under Key Features) and `Features.md` §9 still describe POS as a feature staff use. Reword them to "admin-recorded transactions and read-only history" (see DOC1).

#### [ ] F3: Push notifications. Deferred by the owner, not part of this pass

**Files**
- `radius-frontend/app/(app)/notifications.tsx` (placeholder)
- `radius-frontend/src/hooks/useNotification.ts`
- `expo-notifications` is installed but never imported

Listed only for completeness. The WebSocket event layer (`internal/websocket/hub.go`, `src/hooks/useWebSocket.ts`) is the foundation.

---

## 3. Reliability and CI

#### [x] R1: CI has failed on every recent push. P0 for workflow health

**File:** `.github/workflows/ci.yml`, the `hygiene` job

**Issue**
- `actions/checkout@v4` defaults to a shallow clone (`fetch-depth: 1`), so `git diff --check HEAD~1` fails.
- The `||` fallback then diffs the **whole repository** against an empty tree, so any trailing whitespace anywhere fails the build.
- Current offenders:
  - `.agents/skills/*/SKILL.md`
  - `.agents/skills/pipeline/dev-workflow.md`
  - `CACHING_OPTIMIZATIONS.md`
  - `radius-backend/.gitignore`
  - `radius-backend/internal/repository/cycle_count_repo.go:24`
- The backend and frontend jobs **pass**. Only hygiene fails, but that marks every run red, which hides real failures.

**Fix**
1. Set `fetch-depth: 2`, or diff against `${{ github.event.before }}` / the PR base.
2. Strip the existing trailing whitespace once.
3. Optionally add `.editorconfig` with `trim_trailing_whitespace = true`.

#### [~] R2: CI toolchain doesn't match the project, and checks are missing. P1

**Status (2026-10-07):** CI now uses current GitHub Actions, checks Go formatting and vulnerabilities, and builds the production Docker image. A dedicated golangci-lint pass and database-backed migration tests are still open.

**File:** `.github/workflows/ci.yml`

**Issue**
- It uses `go-version: '1.23'` while `go.mod` says `go 1.26.3` and the Dockerfile uses `golang:1.26-alpine`. CI only works because the Go toolchain auto-downloads the newer version.
- CI never runs `gofmt` checks, `govulncheck`, a linter (`golangci-lint`; `gosec` would catch S5), a Docker build or migration up/down tests.
- `actions/checkout@v4` and `setup-node@v4` trigger the Node 20 deprecation warning.

**Fix**
1. Use `go-version-file: radius-backend/go.mod`.
2. Add `govulncheck` and `golangci-lint` steps, plus `docker build ./radius-backend`.
3. Bump the actions.

#### [x] R3: Startup failures exit with success, and `log.Fatal` skips cleanup. P1

**Status (verified 2026-10-07)**
- Done: DB and Redis connection failures now use `log.Fatalf`, and shutdown logs instead of calling `log.Fatal`.
- Not done (minor): the BOPIS worker context is still only cancelled by `defer`, not before `srv.Shutdown`.

**File:** `radius-backend/cmd/api/main.go` L27–38 and L163–165

**Issue**
- When the DB or Redis connection fails, `main` does `log.Printf(...)` then `return`, which exits with status **0**.
- Orchestrators (Docker restart policies, Render, Kubernetes) treat that as a clean exit and may not restart or alert.
- `log.Fatal` on shutdown skips the deferred `db.Close()`, `redisClient.Close()` and `workerCancel()`.

**Fix**
- Use `log.Fatalf` (or `os.Exit(1)`) on startup failures.
- On shutdown, log and return so the defers run.
- Cancel the BOPIS worker context before `srv.Shutdown`.

#### [x] R4: `/health` doesn't check dependencies. P1

**Status (verified 2026-10-07):** Done. `GET /ready` (`router.go`) pings Postgres and Redis with 2-second timeouts and returns 503 when either fails. `/health` stays as the liveness check.

**File:** `radius-backend/internal/router/router.go` L85–89

**Issue:** It always returns 200 "Server is working!", even when Postgres or Redis is down.

**Why it matters:** Load balancers keep routing traffic to an instance that can't serve requests.

**Fix:** Keep `/health` as liveness. Add `/ready`, which pings the DB (`db.PingContext`) and Redis with a short timeout. `database.CheckRedisHealth` already exists.

#### [x] R5: Frontend requests never time out, and response handling is duplicated. P1

**Status (2026-10-07):** All shared-client requests use a 15-second AbortController timeout and honor caller cancellation. Normal and post-refresh responses share one parser; 409 responses preserve the server message.

**File:** `radius-frontend/src/api/client.ts` L113–186

**Issue**
- `fetch` has no timeout or `AbortController`. On weak back-room or warehouse Wi-Fi, scans and saves hang forever with a spinner.
- The 401-retry branch (L122–165) copies the entire normal response-handling block (L167–185).

**Fix**
1. Combine `AbortSignal.timeout(15000)` with any caller-supplied signal (`AbortSignal.any`). Check this works on Hermes/RN 0.81, or fall back to a manual `AbortController` + `setTimeout`.
2. Move response parsing into one `handleResponse()` used by both paths.

#### [x] R6: 30 `react-hooks/exhaustive-deps` warnings (stale data bugs). P1

**Status (2026-10-07):** Reworked affected screens with stable callbacks and correct dependencies. Both order lists discard stale results on filter, page, or store changes. ESLint now reports zero `react-hooks/exhaustive-deps` warnings.

**Files** (warning counts)
- `home/actions/service/PrintOrders/index.tsx` (5)
- `home/actions/sales_floor/Orders/index.tsx` (5)
- `product-search.tsx` (2)
- `inventory/location/[id].tsx` (2)
- `home/actions/admin/Sessions.tsx` (2)
- `product/[productId].tsx`, `store/index.tsx`, `store/employees.tsx`, `inventory/[productId].tsx`, `PrintOrders/[id].tsx` (1 each)
- All under `radius-frontend/app/(app)/...`

**Issue:** Effects and callbacks capture old state or props, e.g. filters and store context.

**Why it matters:** These cause real stale-data bugs, such as the wrong store's orders appearing after a store switch, or a filter change not refetching.

**Fix:** Fix each warning properly. Don't silence them.

---

## 4. Testing

#### [~] T1: Backend coverage gaps. P1

**Status (2026-10-07):** Added handler and service transition tests for print-order status updates and a middleware role matrix. Repository integration coverage is still open; Docker is unavailable in this local environment.

Coverage measured with `go test -coverprofile`:

| Package | Coverage | Note |
|---|---|---|
| `internal/repository` | **0%** | All SQL is untested: the receiving, transfer, cycle-count and returns transactions, plus the generated-column logic |
| `internal/handler` | **2.0%** | Binding, validation, status codes and the S10 mapping are all untested |
| `internal/config` | 0% | |
| `internal/database` | 18.8% | |
| `internal/middleware` | 21.7% | Auth and role middleware are barely covered |
| `internal/utils` | 27.3% | |
| `internal/service` | 49.1% | |
| `internal/router` | 97.6% | |
| `internal/websocket` | 71.1% | |

**Why it matters**
- The most dangerous logic in the system (multi-statement inventory transactions with `FOR UPDATE`, ledger writes) has no tests.
- S1 would have been caught by a handler or authorization test.

**Fix**
1. Add repository integration tests against real Postgres (`testcontainers-go` or a CI `services: postgres`), running the migrations first.
2. Add `httptest` handler tests.
3. Add middleware tests for missing, expired, refresh-type and terminated-employee tokens.
4. Follow the table-driven style in `internal/service/*_test.go`.

#### [~] T2: The frontend has almost no tests. P1

**Status (2026-10-07):** Jest Expo and React Native Testing Library are configured and run in CI through `npm test`. Added shared-client tests for refresh/retry, conflict, and 304 behavior, plus a component rendering test. Auth context, helpers, barcode, and scanner coverage remain.

**Files**
- `radius-frontend/package.json` `"test": "node --test src/api/cache_manager.test.ts"`
- `radius-frontend/src/api/cache_manager.test.ts` is the only test

**Issue:** `AGENTS.md` says Jest + React Native Testing Library is planned but not set up.

**Fix**
1. Add `jest-expo` and `@testing-library/react-native`.
2. Start with `src/api/client.ts` (refresh, retry, 409, 304), `src/utils/helpers.ts` (`callApi`, cache invalidation), `src/context/AuthContext.tsx`, and the barcode and scanner flows.
3. Point CI's `npm test` at Jest.

#### [~] T3: No authorization test matrix. P1

**Status (2026-10-07):** Added a table-driven role-permission matrix and print-order cross-store/transition tests. A full router route-by-role matrix and cross-store cases for all order resources remain.

See S15. Add one test that walks every route with each role (`SALES`, `SERVICE`, `MANAGER`, `ADMIN`) and also checks cross-store IDs. This is what keeps S1-type bugs from coming back.

---

## 5. Code quality and best practices

#### [x] Q1: Dead backend shells (6 files). P1

**Files**
- Handlers: `radius-backend/internal/handler/out_of_stock_handler.go`, `pricing_handler.go`, `barcode_handler.go`
- Services: `radius-backend/internal/service/out_of_stock_service.go`, `pricing_service.go`, `barcode_service.go`
- Their wiring in `cmd/api/main.go` L70, 80–81, 111, 117–118 and in `router.Handlers` (`router.go` L27, 33–34)

**Issue**
- Each file has only a constructor: no methods and no routes.
- The graph puts them in their own "Handler Interfaces" community with no callers.
- They also inject repositories they never use.

**Fix:** Delete the files, their wiring, and any unused interface entries in `service/interfaces.go`. Regenerate mocks if needed.

#### [x] Q2: Seven empty 0-byte frontend files. P1

**Files**
- `radius-frontend/src/constants/api.ts`
- `radius-frontend/src/hooks/useFillReports.ts`
- `radius-frontend/src/hooks/useOrders.ts`
- `radius-frontend/src/api/inventory.api.ts`, `orders.api.ts`, `store.api.ts`, `transfers.api.ts`

**Issue:** They look like a planned per-domain API layer that was never filled in. Meanwhile the API calls live inline inside the screens.

**Fix:** Either delete them, or actually move each domain's calls into them. The second option also helps Q5 and T2, because screens become thin and testable.

#### [ ] Q3: 46 legacy alias routes double the API surface. P2

**File:** `radius-backend/internal/router/router.go`. Every resource registers both a RESTful path and a legacy alias, e.g. `/:id/approve` and `/approve`, `/:id` and `/get`, `""` and `/create`.

**Issue**
- `tasks.md` says the REST migration is finished.
- The frontend (`src/constants/routes.ts`) still uses only **two** legacy aliases: `inventory/location` (L118, should be `inventory/locations`) and `inventory/adjust` (L119, should be `inventory/adjustments`).

**Why it matters:** Twice the routes to secure, test and document. Legacy aliases read IDs from the body or query instead of the path, which is easier to get wrong.

**Fix**
1. Switch those 2 frontend routes.
2. Delete the alias registrations.
3. Remove the now-unused body/query ID fallbacks in handlers.

#### [ ] Q4: Legacy cache-key helpers still in use. P2

**File:** `radius-backend/internal/cache/cache.go` L231–259 (`LegacyAuthTokenKey`, `LegacyCatalogProductKey`, `LegacyIS4TCKey`, and 5 more)

**Issue:** Every write and invalidation also deletes the old key format, e.g. `session_service.go` L244 and L261. That was a migration bridge.

**Fix:** Once a full TTL window has passed since the key-namespacing change (24h for auth, 7d for sessions), delete the legacy helpers and their call sites.

#### [ ] Q5: Design-token violations of `AGENTS.md` rule 3. P2

**Files with the most hardcoded hex colors**
- `sales_floor/Orders/[id].tsx` (55)
- `back_room/CycleCountDetail.tsx` (35)
- `home/dashboard/index.tsx` (27)
- `src/components/reports/FillReportItem.tsx` (25)
- `src/components/store/StoreOperationsCard.tsx` (22)
- `back_room/Returns.tsx` (19)
- `back_room/CycleCountScanner.tsx` (17)
- `src/components/common/Toast.tsx` (16)
- `back_room/CycleCount.tsx` (16)
- `store/transfers.tsx` (13)
- `back_room/CycleCountCalendar.tsx` (13)
- `src/components/orders/OrderCard.tsx` (10)

**Issue**
- **409** hardcoded hex colors and **21** `rgba(...)` literals outside `src/constants/`.
- **133** inline `style={{...}}` objects.
- **968** hardcoded numeric padding and margin values. `src/constants/styles.ts` defines `globalStyles` but **no spacing, radius or typography scale**, so there is nothing to reference.

**Why it matters**
- Theme changes and dark mode are impossible.
- Status colors drift between screens.
- It is an explicit project rule.

**Fix**
1. Add `SPACING`, `RADIUS` and `FONT_SIZE` tokens to `src/constants/styles.ts`.
2. Add any missing semantic colors (status, success, warning bg) to `colors.ts`.
3. Migrate file by file, largest first.

#### [ ] Q6: Oversized screens. P2

**Files** (line counts)
- `sales_floor/Orders/[id].tsx` (1,894)
- `back_room/Returns.tsx` (1,781)
- `home/dashboard/index.tsx` (1,724)
- `back_room/CycleCountDetail.tsx` (1,209)
- `store/transfers.tsx` (1,155)
- `product-search.tsx` (830)
- `admin/Employees.tsx` (742)

**Issue:** Each one mixes data fetching, state machines, modals and styles.

**Why it matters**
- These can't be unit-tested (T2).
- `AGENTS.md` asks for modular, reusable components.

**Fix**
- Extract modals and cards into `src/components/<domain>/`.
- Extract data access into the empty `src/api/*.api.ts` files (Q2) and hooks.

#### [ ] Q7: 79 ESLint warnings. P2

**Breakdown**
- 35 `no-unused-vars`, e.g. `Card.tsx` L2, `ErrorMessage.tsx` L4, `ProductDetails.tsx` L5/L14, `POCard.tsx` L30
- 30 `exhaustive-deps` (see R6)
- 12 `import/first`, e.g. `Toast.tsx` L62
- 1 `unicode-bom`
- 1 `no-unused-expressions`

**Fix**
- Run `npx expo lint --fix` for the 13 auto-fixable ones, then fix the rest by hand.
- Once clean, add `--max-warnings 0` to the CI lint step.

#### [ ] Q8: 88 `any` types in the frontend. P2

Found with `grep -rnE ": any\b|as any\b|<any>"` over `radius-frontend/app` and `src`, e.g. `catch (err: any)` in `src/utils/helpers.ts`. Replace them with `unknown` plus narrowing, or the real types from `src/types/`.

#### [ ] Q9: Screens mix two API entry points. P2

**Files**
- 12 files use `callApi` (`src/utils/helpers.ts` L44)
- 8 files call `apiFetch`/`apiFetchSWR` directly
- 1 uses raw `fetch` (S14)

**Issue:** `callApi` adds toasts, logout-on-401 and mutation cache invalidation. Direct `apiFetch` callers get none of that.

**Fix:** Standardize on one wrapper, ideally `callApi`, or have `apiFetch` itself do the invalidation.

#### [ ] Q10: JWT validation is implemented twice. P2

**Files**
- `radius-backend/internal/middleware/auth.go` L24–105
- `radius-backend/internal/handler/ws_handler.go` L184–250

**Issue**
- Bearer parsing, HMAC check, token type check, claim extraction and session validation are written twice, with small differences: `EqualFold` vs `==` on "Bearer", and int vs float claim handling.
- The WebSocket copy does re-check active and terminated status from the DB (L274–295), but its store-scope check (`resolveRequestedStore`, L266) uses the JWT `role` claim. The middleware replaces that claim with the DB role (`auth.go` L104). So a demoted `ADMIN` keeps cross-store WebSocket access until their access token expires (up to 15 minutes).

**Why it matters:** A security fix in one place gets missed in the other. This violates the DRY rule.

**Fix:** Extract one `authenticateToken(ctx, tokenString) (*AuthContext, error)` and use it in both places.

#### [ ] Q11: Unstructured logging and no request IDs. P2

**Files:** 194 `log.Printf`/`log.Println` calls across `radius-backend/internal` and `cmd`

**Issue**
- Logs are free text with bracket prefixes.
- There is no request ID, so one request can't be followed through handler, service and repository.
- `gin.Default()` adds its own text logger.

**Fix**
- Use `log/slog` with a JSON handler in release mode.
- Add request-ID middleware (generate or propagate `X-Request-ID`) and include it in logs and error responses.
- Never log tokens or passwords; today this looks fine, so keep it that way.

#### [ ] Q12: Two Postgres drivers. P2

**Files**
- `radius-backend/internal/database/database.go` uses `pgx/v5/stdlib`
- `radius-backend/cmd/seeds/main.go` L14 uses `lib/pq`

**Fix:** Use `pgx` in the seeds runner and drop `lib/pq` from `go.mod` unless `golang-migrate` needs it.

#### [ ] Q13: Two columns for the card last-4. P2

**Files**
- `radius-backend/migrations/000018_add_card_details_to_transactions.up.sql` (`card_number VARCHAR(4)`)
- `000022_add_payment_card_last4.up.sql` (`payment_card_last4 VARCHAR(4)`)
- `internal/repository/sales_repo.go`

**Issue:** Both columns store the same thing. The name `card_number` also suggests a full PAN is stored, which worries PCI reviewers.

**Fix:** Write a migration that backfills `payment_card_last4` from `card_number` and drops `card_number`. Rename the model field to `CardLast4`.

#### [ ] Q14: Accessibility is essentially missing. P2

**Files:** all of `radius-frontend/app` and `src/components`

**Issue:** 264 `TouchableOpacity`/`Pressable` elements, but only 2 `accessibilityLabel`/`accessibilityRole` props in the whole app. Icon-only buttons (back, filter, sort, scan) are unlabeled for screen readers.

**Fix:** Add `accessibilityRole` and `accessibilityLabel` to shared components first (`BackButton`, `HeaderComponent` actions, icon buttons in `src/components/common/`). That covers most screens.

#### [ ] Q15: Long lists rendered with `ScrollView` + `.map()`. P2

**Files:** 16 screen files under `radius-frontend/app` combine `<ScrollView>` with `.map(` (find them with `grep -rl "\.map(" app | xargs grep -l "<ScrollView"`). 30 `FlatList` uses already exist.

**Issue:** Large lists such as PO line items, cycle-count items and transfer manifests render every row at once.

**Fix:** Use `FlatList` for any list that isn't bounded and small.

#### [ ] Q16: Leftover `console.*` calls. P2

**Issue:** 12 `console.log/warn/error` calls in `radius-frontend/app` and `src`.

**Fix:** Remove them, or send them through a single logger that is silent in production builds.

---

## 6. Release and deployment

#### [~] D1: The Expo app config isn't release-ready. P1

**Status (2026-10-07):** Scheme and camera permission are fixed; Expo Doctor passes except for local CocoaPods tooling. Permanent bundle/package IDs still require the owner's choice before first store submission.

**File:** `radius-frontend/app.json`

**Issue**
- `"scheme": "Radius"` fails `expo-doctor` (it must match `^[a-z][a-z0-9+.-]*$`), which breaks deep links.
- `ios.bundleIdentifier` is `com.anonymous.radius-frontend` and `android.package` is `com.anonymous.radiusfrontend`. These are template placeholders that can't be changed after the first store release.
- There is no `version`/`buildNumber`/`versionCode` strategy.
- There is no camera permission text. `expo-camera` needs `NSCameraUsageDescription` on iOS through its config plugin, and the plugin isn't listed in `plugins`.

**Fix**
- Set `scheme: "radius"` and real reverse-DNS identifiers.
- Add the `expo-camera` plugin with a permission message.
- Re-run `npx expo-doctor` until it is clean (ignore the local-only CocoaPods check).

#### [x] D2: The EAS build profiles aren't store-ready. P1

**Status (2026-10-07):** Production uses AAB by default and remote auto-incrementing build versions. OTA updates are intentionally not enabled; store submission is manual and documented in the frontend README. Permanent app identifiers remain tracked under D1.

**File:** `radius-frontend/eas.json`

**Issue**
- The `production.android.buildType` is `apk`, but Google Play requires an AAB (the default when `buildType` is omitted).
- There is no `autoIncrement`, no `channel` for OTA updates (`expo-updates` isn't installed), and `submit.production` is empty.

**Fix**
- Remove `buildType` from `production`.
- Add `"autoIncrement": true` and `appVersionSource`.
- Decide on `expo-updates`.
- Fill in the submit config or document manual submission.

#### [x] D3: The production Docker image ships tools that can't run in it. P1

**File:** `radius-backend/Dockerfile`

**Issue**
- It builds and copies `/app/bin/seeds` and `/app/seeds`. `cmd/seeds/main.go` L29 runs `python3`, but the `alpine:3.21` runtime has no Python, so the binary can't work there. It is dead weight, and it is a risk (S7).
- The file is full of banner comments, which goes against the `AGENTS.md` no-comments rule.

**Fix**
- Keep `api` and `migrate` in the runtime image and run seeds only from a dev environment.
- Strip the comments.
- Pin the base image versions after the S8 bump.

#### [x] D4: Template leftovers and possibly unused dependencies. P1

**Status (2026-10-07):** Removed the dead reset script, verified and removed unused direct dependencies, removed four unreferenced Expo template images, and replaced the template frontend README. Peer dependencies such as `@react-navigation/elements` remain transitively installed where required.

**Files**
- `radius-frontend/package.json`:
  - The `"reset-project": "node ./scripts/reset-project.js"` script points at a `scripts/` folder that doesn't exist.
  - `expo-symbols`, `expo-web-browser`, `expo-image` and `@react-navigation/elements` are never imported.
  - `expo-notifications` is never imported, but keep it for F3.
- `radius-frontend/assets/images/react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png` and `partial-react-logo.png` are unreferenced Expo template assets.
- `radius-frontend/README.md` is the unmodified `create-expo-app` README.

**Caution:** Some packages that look unused are peer or runtime dependencies: `react-native-pager-view` (used by material-top-tabs), `expo-linking`/`expo-font`/`expo-system-ui` (used by expo-router and plugins), and `react-dom`/`react-native-web` (the web target). Check with `npx expo install --check` and a test build before removing anything.

**Fix**
- Remove the dead script and template images.
- Remove dependencies that are confirmed unused.
- Rewrite the frontend README: env setup (`EXPO_PUBLIC_API_URL` from `.env.example`), running on a device, and building with EAS.

#### [ ] D5: No crash reporting or error boundary in the app. P2

**Files:** `radius-frontend/app/_layout.tsx`, which has no `ErrorBoundary` export anywhere

**Issue**
- expo-router supports exporting an `ErrorBoundary` from a layout, but none is defined.
- Any render exception white-screens the app with no recovery and no report.

**Fix**
- Export an `ErrorBoundary` from the root and `(app)` layouts that uses the existing `ErrorMessage` component.
- Consider `sentry-expo` / `@sentry/react-native` for production crash reporting.

---

## 7. Documentation

#### [x] DOC1: README facts are wrong. P1

**File:** `README.md`

**Issue**
- L68 says "Go 1.24", but `go.mod` says 1.26.3 (1.26.6 after S8).
- L71 says "37 sequential versioned schema migrations"; there are 43 (`000001` to `000043`).
- The badge at the top also says Go 1.24.
- §9 claims POS processing and §11 claims print status tracking, which F1 and F2 contradict.

**Fix:** Correct the numbers. Make the feature claims match whatever is decided for F1 and F2.

#### [ ] DOC2: Planning documents contradict each other and are partly stale. P2

**Files and problems**
- `tasks.md` lists POS checkout and print updates as open. `Features.md` describes both as working features (§9, §11).
- `CACHING_OPTIMIZATIONS.md` still describes several bugs as current that are already fixed:
  - Remote session termination now deletes the Redis keys (`session_service.go` L243–266).
  - IS4TC sessions now use Redis hashes (`fill_report_service.go` uses `HSet`), so the race is gone.
  - Trigram search indexes exist (migrations `000042` and `000043`).
  - Employee context is cached (`employee_service.GetEmployeeContext`).
- `PROJECT_REMAINING_WORK.md`, `IMPELMENTATION_PLAN.md` (note the misspelling) and `EMPLOYEE_ASSISTANT_BOT_PLAN.md` exist only locally.

**Gitignore problem:** The root `.gitignore` ignores `*.md` except README and AGENTS. That means `Features.md`, `tasks.md` and `CACHING_OPTIMIZATIONS.md` are tracked only because they were force-added, while **this file and the other planning docs are untracked**. Any agent working from a fresh clone or the cloud won't see them, and graphify now skips them as well.

**Fix**
1. Add `!PROJECT_COMPLETION_AUDIT.md` (and any other docs you want shared) to `.gitignore`, or drop the `*.md` rule.
2. Mark the fixed items in `CACHING_OPTIMIZATIONS.md` as done.
3. Merge `tasks.md` into this file, or delete it.
4. Archive or delete the stale plans.

#### [ ] DOC3: There's no API reference. P2

**Context:** The OpenAPI spec (`radius-backend/api/openapi.yaml`) was deliberately deleted in `83ad248`.

**Issue**
- With 120+ routes, plus 46 aliases until Q3 is done, the only contract is `router.go` and `src/constants/routes.ts`.
- `.agents/agents/api-contract-sync.json` exists to keep them in sync, but has no spec to sync against.

**Fix:** Either restore a generated spec (e.g. `swaggo/swag` from handler annotations, though that conflicts with the no-comments rule) or keep a hand-written route table in `README.md`. Decide once.

#### [ ] DOC4: `.env` documentation is incomplete. P2

**Files:**
- `radius-backend/.env.example`
- `radius-frontend/.env.example`

**Issue:** The backend example is missing `RUN_MIGRATIONS`. It ships `ALLOWED_ORIGINS=*` and `GIN_MODE=debug` with no explanation of what to use in production.

**Fix:** Add every variable `internal/config/config.go` reads, with a one-line description of the safe production value.

---

## 8. Verified OK (no action needed)

These were checked and are fine. Don't spend time re-auditing them.

- **SQL injection:** queries are parameterized through `internal/util/queryutil` `Builder`. The only interpolated `ORDER BY` direction (`fill_report_repo.go` L122–150) is whitelisted to `ASC`/`DESC`.
- **DB calls carry context:** every repository query uses the `*Context` variant. 17 multi-statement transactions use `defer tx.Rollback()`, and `FOR UPDATE` is used where stock is decremented.
- **Passwords:** bcrypt with default cost, min length 8 when binding, and `PasswordHash` is `json:"-"`.
- **JWT:** HS256 with the algorithm-family check, a 32-byte minimum secret enforced in `config.validate()`, a 15-minute access token, and access vs refresh `token_type` enforced. Terminated or inactive employees are rejected on every request.
- **WebSocket auth:** short-lived (30s) Redis tickets, store-scope checks, session validation, and an origin allow-list that fails closed in release.
- **Session revocation and IS4TC concurrency:** fixed (see DOC2).
- **Frontend token storage:** `expo-secure-store` for access and refresh tokens and user info. Nothing is in AsyncStorage.
- **Comment hygiene:** only about 5 frontend and 1 backend non-test comments remain. Compliant.
- **Formatting and static checks:** `gofmt -l`, `go vet` and `tsc --noEmit` are clean. All Go tests pass.
- **Graph health:** no import cycles. The 1,027 "dangling" edges in graphify's diagnostic are references to stdlib and external types, which is expected for AST extraction.

---

## 9. Suggested order of work

1. **Unblock CI** (R1), so every later change gets a trustworthy green or red result.
2. **P0 security:**
   - S1 (IDOR)
   - S2 (server-side pricing)
   - S3 (metrics)
   - S4 (proxy trust, login limits)
   - S5 (timeouts, body limit)
   - S6 (compose secrets)
   - S7 (seed guard)
   - S8 (dependency bumps)
   - Each with tests, which starts T1 and T3.
3. **Error model** (S10). It touches every handler, so do it before adding more handlers.
4. **Features** F1 (print lifecycle) and F2 (POS checkout, or descope), built on the new error model and S2 pricing.
5. **Remaining P1:**
   - S9, S11–S15
   - R2–R6
   - T1–T3
   - Q1, Q2
   - D1–D4
   - DOC1
6. **P2 cleanup:**
   - Q3–Q16
   - D5
   - DOC2–DOC4
   - Re-run `graphify` (`/graphify . --update`) after big refactors so the graph stays accurate for future agents.

When every P0 and P1 box is ticked, CI is green, `govulncheck` is clean, `expo-doctor` passes, and F1 and F2 are built or formally descoped, the project can reasonably be called complete.
