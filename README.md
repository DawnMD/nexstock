# NexStock

**Live résumé demo:** [nexstock-neon.vercel.app](https://nexstock-neon.vercel.app)

| Email                    | Password        |
| ------------------------ | --------------- |
| `demo@demo.nexstock.app` | `nexstock-demo` |

This is one shared, writable warehouse. Changes are visible to other visitors
and the synthetic dataset resets nightly. Please do not enter personal or
confidential data.

A warehouse management system (WMS) covering both directions. Inbound: a
purchase order arrives, a vehicle books a dock, the goods are inspected and
received against the order lines, and stock is put away into a storage location.
Outbound: a sales order reserves specific pallets, a picker fetches them, they
are boxed into cartons and dispatched.

Every movement in either direction goes through one append-only ledger, and the
`/inventory` screen shows the reconciliation between that ledger and the
materialised balances rather than asking you to take it on trust.

## The inbound flow

```
Orders → Dock booking → Quality check → Receive → Putaway → Adjustments
```

| Step              | Route                              | What happens                                                                                                                           |
| ----------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Orders**        | `/orders`, `/orders/[orderNumber]` | Purchase orders from vendors, each with line items (SKU + ordered quantity).                                                           |
| **Dock booking**  | `/dock-booking`                    | Book a vehicle onto a dock for an order. Activities track the vehicle: `CHECK_IN` → `OPEN` → `CLOSE` → `CHECK_OUT`.                    |
| **Quality check** | `/quality-check`                   | Inspect a line item once its container has been opened; record inspected and rejected quantities.                                      |
| **Receive**       | `/receive`                         | Receive stock against an order line. Each receipt creates a `ReceiveItem` with an LPN (pallet label), lot, UOM and a staging location. |
| **LPN list**      | `/lpn-list`                        | Browse what has been received, by order.                                                                                               |
| **Putaway**       | `/putaway`, `/putaway/[lpn]`       | Move a received LPN from staging into a storage `Location`.                                                                            |
| **Adjustments**   | `/adjustments`                     | Record additions/subtractions against an order line to correct quantities.                                                             |
| **Dashboard**     | `/dashboard`                       | Order stats and today's dock schedule.                                                                                                 |
| **Reports**       | `/reports`                         | Throughput, aging, utilisation, quality and dock turnaround, each with CSV export. See [Reporting](#reporting).                        |

## The outbound flow

```
Sales orders → Allocate → Pick → Pack → Ship
```

| Step             | Route                                          | What happens                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sales orders** | `/sales-orders`, `/sales-orders/[orderNumber]` | Orders going out to a `Customer`, each with line items.                                                                                                                                         |
| **Allocate**     | on the sales order screen                      | Reserves specific pallets, FEFO then FIFO, producing one `PickTask` per balance drawn against. Nothing moves; open reservations are netted off so two orders cannot be promised the same stock. |
| **Pick**         | `/pick`                                        | The worklist, in aisle order. Confirming moves stock out of the rack and into the dispatch bay — a net-zero pair, like a putaway. Short picks are recorded as such.                             |
| **Pack**         | `/ship?order=…`                                | Boxes picked lines into a `Carton`. Writes no stock movement: the units are already in the bay, and a carton says how they are boxed, not where they are.                                       |
| **Ship**         | `/ship?order=…`                                | Dispatches cartons on a `Shipment`. The only operation in NexStock that reduces stock on hand without being a write-off.                                                                        |

## Reporting

`/reports` answers the questions the warehouse data can already support, with a
CSV export beside each one:

| Report                   | What it shows                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Throughput**           | Units received and shipped per day. Two charts, never one with two y-axes.                                                           |
| **Stock aging**          | On-hand bucketed by age, measured from the receipt that brought each pallet in — so relocating a pallet does not make it look new.   |
| **Location utilisation** | Volume used against each rack's rating. An unrated rack reports nothing rather than 0%; "unrated" and "empty" are different answers. |
| **Reject rate by SKU**   | Rejected over received across every line, so a SKU that consistently arrives damaged stands out from one bad pallet.                 |
| **Dock turnaround**      | Check-in to check-out per vehicle. `DockActivity` has recorded these timestamps since the schema was written and nothing read them.  |

Export is a route handler (`/api/reports/[report]`) rather than an oRPC
procedure, because the browser has to be handed a file — but the data comes from
the same procedures the screens render, through a server-side router client, so a
report and its export cannot drift apart.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, React 19, Turbopack in dev)
- [oRPC 1](https://orpc.dev) + [TanStack Query](https://tanstack.com/query)
- [Prisma 7](https://prisma.io) on Postgres — [Neon](https://neon.tech) via `@prisma/adapter-neon`, or any plain Postgres via `@prisma/adapter-pg`; the connection string decides
- [Better Auth](https://better-auth.com) for authentication (self-hosted sessions, email + password)
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Base UI primitives)
- [Recharts](https://recharts.org) for the report charts
- [Vitest](https://vitest.dev) against a real Postgres, and [Playwright](https://playwright.dev) end to end

## Getting started

### Prerequisites

- Node.js 22+ (the Neon serverless driver needs a global `WebSocket`)
- pnpm 9 (`corepack enable`)
- Postgres. A [Neon](https://console.neon.tech) project (free tier is fine) is
  what this is deployed on, but any local Postgres works — `server/db.ts` picks
  the driver adapter from the connection string.

### Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable                | Description                                                                                                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Connection string used by Prisma Client at runtime. On Neon this is the **pooled** one — the host contains `-pooler`.                                                                                                        |
| `DATABASE_URL_UNPOOLED` | Direct connection string. On Neon this is the same host without `-pooler`. Used by the Prisma CLI for migrations and by the `prisma/` scripts.                                                                               |
| `BETTER_AUTH_SECRET`    | 32+ character random string that signs session cookies. Generate one with `npx auth@latest secret`.                                                                                                                          |
| `BETTER_AUTH_URL`       | Optional. Public origin, e.g. `https://wms.example.com`. Required when serving from anywhere other than `localhost:3000` or `*.vercel.app` — without it Better Auth rejects the request as an unknown host and sign-in 500s. |
| `RESEND_API_KEY`        | [Resend](https://resend.com) API key. Sign-up is gated on a verification email, so this has to be a real key.                                                                                                                |
| `EMAIL_FROM`            | `From` header on outbound mail. Defaults to `NexStock <onboarding@resend.dev>`, which only delivers to the Resend account owner.                                                                                             |
| `DEMO_MODE`             | `off`, `read-only` (the local default), or `shared-writable`. Only the configured demo email bypasses the demo write guard in the last mode.                                                                                 |
| `DEMO_ACCOUNT_EMAIL`    | Published shared account email. Defaults to `demo@demo.nexstock.app`.                                                                                                                                                        |
| `DEMO_ACCOUNT_PASSWORD` | Published shared account password. Defaults to `nexstock-demo`; set it explicitly in production so provisioning and the sign-in card agree.                                                                                  |
| `ALLOW_SIGN_UP`         | Set to `false` on the public deployment. Removes the sign-up link and page and makes Better Auth reject direct sign-up API calls.                                                                                            |
| `CRON_SECRET`           | Random 16+ character secret protecting `GET /api/internal/demo-reset`. Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`.                                                                                        |

Both connection strings are on the Neon dashboard under **Connect** — toggle
_Connection pooling_ to switch between them. Keep `?sslmode=require`; if a query
times out while the compute is waking from idle, append `&connect_timeout=10`.

The values shipped in `.env.example` are well-formed placeholders so that
`pnpm build` succeeds in CI; they will not authenticate against anything real.
Env vars are validated at startup by `env.js` — set `SKIP_ENV_VALIDATION=1` to
bypass that (useful for Docker builds).

Prisma 7 no longer loads `.env` implicitly, so `prisma.config.ts` does it
explicitly, reading `.env.local` first and then `.env` (Next.js' precedence).
`pnpm install` works without either — `prisma generate` needs no database — but
`pnpm db:migrate` and the `prisma/` scripts need `DATABASE_URL_UNPOOLED` when
using Neon. For local PostgreSQL, `prisma.config.ts` uses `DATABASE_URL`
directly, so one connection string is enough.

### Setup

```bash
pnpm install        # also runs `prisma generate`
pnpm db:migrate     # apply migrations to your database

# Create an account out of band, pre-verified. `/sign-up` works too, but the
# seed below needs the id this prints.
pnpm user:create you@example.com "Your Name" "your-password"

pnpm db:seed:as --user-id=<the id it printed>   # sample data attributed to you
pnpm dev            # http://localhost:3000 → redirects to /sign-in
```

The seed is destructive and re-runnable: it clears all 21 warehouse tables
before inserting, so you can run it as often as you like to get back to a known
state. It deliberately leaves `User`, `Session` and `Account` alone, so
re-seeding never destroys accounts or logs you out. It creates 50 vendors, 10
SKUs, 20 storage locations plus staging and dispatch, 10 docks, 50 orders (10
line items each), dock bookings with check-in/open activities for the first 20
orders, and receipts against the first 12 — enough that every screen has data on
first load.

Every audit column (`createdBy`, `receivedBy`, `putawayBy`, …) is a foreign key
onto `User`, so the seed needs a real account to attribute its rows to. Bare
`pnpm db:seed` falls back to a synthetic `SYSTEM` user that has no password and
can never sign in, which keeps CI and `prisma migrate reset` working with no
arguments. `SEED_USER_ID=<id> pnpm db:seed` is equivalent to the `--user-id`
flag and is the only form that survives paths which cannot forward CLI args.

### Authentication

Email and password only — no social providers. When `ALLOW_SIGN_UP=true`,
sign-up is self-serve at `/sign-up` and gated on email verification: Better
Auth mails a one-hour link through Resend and refuses to create a session until
it is clicked, so an unverified account can do nothing. Clicking the link signs
the user in and drops them on `/dashboard`; a dead or expired link lands on
`/verify-email`, which can mail a fresh one. Signing in with an unverified
address also re-sends the link.

Sign-up responses are deliberately uninformative — an address that already has
an account gets the same "check your inbox" screen as a new one — so the form
cannot be used to enumerate accounts.

Set `ALLOW_SIGN_UP=false` for a closed deployment. The sign-up route then
returns 404, the sign-in card omits its registration link, and Better Auth's
server endpoint rejects direct sign-up requests. Out-of-band account commands
continue to work.

### Demo modes

`pnpm user:create demo@example.com "Demo" "password" --demo` creates an account
that can browse every screen and change nothing. It is a real, verified user, so
the read paths are not special-cased anywhere; what stops it writing is
`writeProcedure` in `server/api/orpc.ts`, which every mutation is built on and
which refuses a caller whose `isDemo` flag is set. The banner in the layout only
explains the refusal — it is not what enforces it.

The flag is read from the database rather than the session, so revoking demo
status takes effect on the next request instead of whenever the five-minute
session cache expires.

`DEMO_MODE=shared-writable` grants a single exception: the demo user whose
email exactly matches `DEMO_ACCOUNT_EMAIL` may use every warehouse mutation.
Any other user with `isDemo=true` stays read-only. `DEMO_MODE=read-only` keeps
the original behavior, and `off` removes published demo credentials from
sign-in while preserving the server-side `isDemo` protection.

Sign in at `/sign-in`; every page under `app/(inbound)/` calls
`requireSession()` and every mutating oRPC procedure is a `writeProcedure`.

### Public demo walkthrough

The dashboard shows demo users three focused scenarios:

1. **Inspect inventory integrity** at `/inventory`: compare balances, movement
   history, and ledger reconciliation.
2. **Complete an inbound task** at `/putaway/LPN000002`: move the seeded pallet
   from staging into a valid rack.
3. **Run an outbound workflow** at `/sales-orders/SO-00001`: allocate the
   unreserved order, then pick, pack, and ship it.

### Vercel + Neon deployment

Use [Neon's pooled connection guidance](https://neon.com/docs/connect/connection-pooling)
for `DATABASE_URL` at runtime and its direct connection string for
`DATABASE_URL_UNPOOLED`. Migrations and demo resets are long administrative
transactions and must use the direct connection.
Add every variable from `.env.example` to the Vercel Production environment,
with `DEMO_MODE=shared-writable` and `ALLOW_SIGN_UP=false`.

After the first production deployment, run these one-time commands:

```bash
vercel env run -e production -- pnpm db:migrate
vercel env run -e production -- pnpm demo:provision
```

`demo:provision` is idempotent: it creates or updates the verified credential
account, replaces its password, marks it as a demo user, and performs the
initial reset. `vercel.json` invokes `GET /api/internal/demo-reset` at
`30 20 * * *`, approximately 02:00 IST.
[Vercel Hobby cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs) can run
at any point within the scheduled hour.

The reset clears and reseeds every warehouse table in one transaction while
preserving `User`, `Account`, and `Session`. It uses a transaction-scoped
PostgreSQL advisory lock, so overlapping cron/manual runs return `409` instead
of interleaving. Invalid Bearer tokens return `401`; successful requests
return the reset timestamp and seed counts. An owner can trigger the same path
with `pnpm demo:reset` or:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://nexstock-neon.vercel.app/api/internal/demo-reset
```

## Scripts

| Script                | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`            | Dev server with Turbopack.                                                        |
| `pnpm build`          | Production build (typechecks and lints).                                          |
| `pnpm start`          | Serve the production build.                                                       |
| `pnpm typecheck`      | `tsc --noEmit`.                                                                   |
| `pnpm lint`           | ESLint via `next lint`.                                                           |
| `pnpm test`           | Service-layer tests (Vitest) against a real Postgres. See [Testing](#testing).    |
| `pnpm test:watch`     | The same suite in watch mode.                                                     |
| `pnpm test:e2e`       | Playwright end-to-end tests against a built app. See [Testing](#testing).         |
| `pnpm format:check`   | Prettier check.                                                                   |
| `pnpm format:write`   | Prettier write.                                                                   |
| `pnpm db:push`        | Push schema without a migration (dev), then regenerate the client.                |
| `pnpm db:generate`    | Create and apply a migration (`prisma migrate dev`), then regenerate the client.  |
| `pnpm db:migrate`     | Apply migrations (`prisma migrate deploy`).                                       |
| `pnpm db:seed`        | Reset and seed the warehouse tables (as the synthetic `SYSTEM` user).             |
| `pnpm db:seed:as`     | Same, but forwards `--user-id=<id>` so the data is attributed to a real account.  |
| `pnpm demo:provision` | Create/update the published verified demo account and perform its initial seed.   |
| `pnpm demo:reset`     | Restore the demo warehouse through the direct administrative database connection. |
| `pnpm db:reset`       | Drop the database and replay every migration. **Destroys all data.**              |
| `pnpm user:create`    | Create an account: `pnpm user:create <email> "<name>" "<password>" [--demo]`.     |
| `pnpm db:studio`      | Prisma Studio.                                                                    |

CI (`.github/workflows/ci.yaml`) runs lint, Prettier, typecheck, unit tests,
build and end-to-end tests on every pull request.

## Testing

The tests exercise `server/services/` — the layer that owns every stock
movement — against a **real Postgres**, not a mocked Prisma client. That is
deliberate: what these tests assert is `SELECT … FOR UPDATE` serialising two
concurrent receipts, an atomic `increment` refusing to take a balance negative,
`FULL JOIN` reconciliation, and transaction rollback. None of that survives a
mock, which would only confirm that the code calls the functions it calls.

Point `TEST_DATABASE_URL` at a throwaway database, apply the migrations, and run
the suite:

```bash
createdb nexstock_test
export TEST_DATABASE_URL="postgresql://postgres@localhost:5432/nexstock_test"
DATABASE_URL_UNPOOLED="$TEST_DATABASE_URL" pnpm db:migrate
pnpm test
```

### End-to-end

`pnpm test:e2e` drives the real app in Chromium — a production build, a real
database, a real session — which is what proves the oRPC routers and the screens
are wired to the services underneath them. Point `.env` at a seeded database,
set `BETTER_AUTH_URL` to the port Playwright serves on, and run it:

```bash
createdb nexstock_e2e
# In .env: DATABASE_URL, DATABASE_URL_UNPOOLED → nexstock_e2e
#          BETTER_AUTH_URL=http://127.0.0.1:3100
pnpm db:migrate && pnpm db:seed && pnpm build
pnpm test:e2e
```

The operator account is created by `global-setup.ts` (via `pnpm user:create`,
which skips the verification email) and signed in through the real form once;
the specs reuse that session. If the machine already has a Chromium that
Playwright did not install, point `PLAYWRIGHT_CHROMIUM_PATH` at it instead of
downloading another.

Every test that moves stock ends by asserting the invariant the whole inventory
core rests on — `sum(InventoryMovement.quantity) === InventoryBalance.quantity`
for every key — using the same query `inventory.getDrift` serves to the
`/inventory` screen. CI runs all of it against a `postgres:16` service
container.

The tests connect with `@prisma/adapter-pg`, as the app itself does for any
non-Neon connection string. Only the transport differs from a Neon deployment —
the services take a `Prisma.TransactionClient` and never learn which adapter
produced it.

## Project layout

```
app/             App Router routes; the inbound screens live under app/(inbound)/
components/      React components; components/ui/ is shadcn
server/services/ the business logic: every stock movement goes through here
                 inbound: receiving, quality, putaway, adjustments
                 outbound: allocation, picking (pack/ship), sales-orders
server/api/      oRPC routers, which are thin shells over the services
orpc/            oRPC client/server wiring and the React Query client
prisma/          schema.prisma, migrations, seed.ts
tests/           Vitest suites, run against a real Postgres
generated/       Prisma Client, generated from the schema (gitignored)
lib/             shared helpers
```

## Known limitations

- **No authorization.** Better Auth authenticates users, but there is no role,
  org or tenant model. `privateProcedure` only checks that a user is signed in,
  so any signed-in user can read every order and mutate any booking, receipt,
  quality check, adjustment or putaway. Fine for a single-operator hobby
  deployment; this is the first thing to build before it goes multi-user.
- **No roles beyond read-only.** `isDemo` is the only authorization the app has;
  every other signed-in user can do everything. A real deployment needs an
  operator/supervisor/admin split, and `writeProcedure` is the seam to build it on.
- **No wave picking.** Pick tasks are generated per sales order rather than
  batched across orders into waves, so a picker walks the aisles once per order.
- **Sales orders are created through the API, not a form.** `outbound.createSalesOrder`
  is complete and tested; the screen to drive it is not built yet, so the seed
  is what puts orders on the board.
