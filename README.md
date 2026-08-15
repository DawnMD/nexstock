# NexStock

An inbound warehouse management system (WMS). NexStock covers the receiving
side of a warehouse: a purchase order arrives, a vehicle books a dock, the goods
are inspected and received against the order lines, stock is put away into a
storage location, and any discrepancies are corrected with adjustments.

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

## Stack

- [Next.js 15](https://nextjs.org) (App Router, React 19, Turbopack in dev)
- [tRPC 11](https://trpc.io) + [TanStack Query](https://tanstack.com/query)
- [Prisma 7](https://prisma.io) on [Neon](https://neon.tech) Postgres (via the `@prisma/adapter-neon` driver adapter)
- [Better Auth](https://better-auth.com) for authentication (self-hosted sessions, email + password)
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Base UI primitives)

## Getting started

### Prerequisites

- Node.js 22+ (the Neon serverless driver needs a global `WebSocket`)
- pnpm 9 (`corepack enable`)
- A [Neon](https://console.neon.tech) project (free tier is fine)

### Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable                            | Description                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                      | Neon **pooled** connection string — the host contains `-pooler`. Used by Prisma Client at runtime.                                   |
| `DATABASE_URL_UNPOOLED`                        | Neon **direct** connection string (same host without `-pooler`). Used by the Prisma CLI for migrations and by the `prisma/` scripts. |
| `BETTER_AUTH_SECRET`                | 32+ character random string that signs session cookies. Generate one with `npx auth@latest secret`.                                  |
| `RESEND_API_KEY`                    | [Resend](https://resend.com) API key. Sign-up is gated on a verification email, so this has to be a real key.                        |
| `EMAIL_FROM`                        | `From` header on outbound mail. Defaults to `NexStock <onboarding@resend.dev>`, which only delivers to the Resend account owner.     |

Both connection strings are on the Neon dashboard under **Connect** — toggle
_Connection pooling_ to switch between them. Keep `?sslmode=require`; if a query
times out while the compute is waking from idle, append `&connect_timeout=10`.

The values shipped in `.env.example` are well-formed placeholders so that
`pnpm build` succeeds in CI; they will not authenticate against anything real.
Env vars are validated at startup by `env.js` — set `SKIP_ENV_VALIDATION=1` to
bypass that (useful for Docker builds).

Prisma 7 no longer loads `.env` implicitly, so `prisma.config.ts` does it
explicitly, reading `.env.local` first and then `.env` (Next.js' precedence).
Create one of those before `pnpm install`, since the postinstall
`prisma generate` needs `DATABASE_URL_UNPOOLED`.

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

The seed is destructive and re-runnable: it clears the 14 warehouse tables
before inserting, so you can run it as often as you like to get back to a known
state. It deliberately leaves `User`, `Session` and `Account` alone, so
re-seeding never destroys accounts or logs you out. It creates 50 vendors, 10
SKUs, 20 locations, 10 docks, 50 orders (10 line items each), dock bookings with
check-in/open activities for the first 20 orders, and receipts against the first
12 — enough that every screen has data on first load.

Every audit column (`createdBy`, `receivedBy`, `putawayBy`, …) is a foreign key
onto `User`, so the seed needs a real account to attribute its rows to. Bare
`pnpm db:seed` falls back to a synthetic `SYSTEM` user that has no password and
can never sign in, which keeps CI and `prisma migrate reset` working with no
arguments. `SEED_USER_ID=<id> pnpm db:seed` is equivalent to the `--user-id`
flag and is the only form that survives paths which cannot forward CLI args.

### Authentication

Email and password only — no social providers. **Sign-up is self-serve** at
`/sign-up` and gated on email verification: Better Auth mails a one-hour link
through Resend and refuses to create a session until it is clicked, so an
unverified account can do nothing. Clicking the link signs the user in and drops
them on `/dashboard`; a dead or expired link lands on `/verify-email`, which can
mail a fresh one. Signing in with an unverified address also re-sends the link.

Sign-up responses are deliberately uninformative — an address that already has
an account gets the same "check your inbox" screen as a new one — so the form
cannot be used to enumerate accounts.

There is no allowlist, so anyone who controls a mailbox can register. If that is
not acceptable for a deployment, put it behind a network boundary or set
`emailAndPassword.disableSignUp: true` in `lib/auth.ts` and mint accounts with
`pnpm user:create`, which still works and marks the address verified.

Sign in at `/sign-in`; every page under `app/(inbound)/` calls
`requireSession()` and every mutating tRPC procedure is a `privateProcedure`.

## Scripts

| Script              | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `pnpm dev`          | Dev server with Turbopack.                                                       |
| `pnpm build`        | Production build (typechecks and lints).                                         |
| `pnpm start`        | Serve the production build.                                                      |
| `pnpm typecheck`    | `tsc --noEmit`.                                                                  |
| `pnpm lint`         | ESLint via `next lint`.                                                          |
| `pnpm test`         | Service-layer tests (Vitest) against a real Postgres. See [Testing](#testing).   |
| `pnpm test:watch`   | The same suite in watch mode.                                                    |
| `pnpm format:check` | Prettier check.                                                                  |
| `pnpm format:write` | Prettier write.                                                                  |
| `pnpm db:push`      | Push schema without a migration (dev), then regenerate the client.               |
| `pnpm db:generate`  | Create and apply a migration (`prisma migrate dev`), then regenerate the client. |
| `pnpm db:migrate`   | Apply migrations (`prisma migrate deploy`).                                      |
| `pnpm db:seed`      | Reset and seed the warehouse tables (as the synthetic `SYSTEM` user).            |
| `pnpm db:seed:as`   | Same, but forwards `--user-id=<id>` so the data is attributed to a real account. |
| `pnpm db:reset`     | Drop the database and replay every migration. **Destroys all data.**             |
| `pnpm user:create`  | Create an account: `pnpm user:create <email> "<name>" "<password>"`.             |
| `pnpm db:studio`    | Prisma Studio.                                                                   |

CI (`.github/workflows/ci.yaml`) runs lint, Prettier, typecheck, tests and build
on every pull request.

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

Every test that moves stock ends by asserting the invariant the whole inventory
core rests on — `sum(InventoryMovement.quantity) === InventoryBalance.quantity`
for every key — using the same query `inventory.getDrift` serves to the
`/inventory` screen. CI runs all of it against a `postgres:16` service
container.

Note that the app talks to Neon over WebSockets via `@prisma/adapter-neon`,
which needs a Neon endpoint; the tests use `@prisma/adapter-pg` against plain
Postgres instead. Only the transport differs — the services take a
`Prisma.TransactionClient` and never learn which adapter produced it.

## Project layout

```
app/             App Router routes; the inbound screens live under app/(inbound)/
components/      React components; components/ui/ is shadcn
server/services/ the business logic: every stock movement goes through here
server/api/      tRPC routers, which are thin shells over the services
trpc/            tRPC client/server wiring and the React Query client
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
- **Inbound only.** There is no picking, packing or shipping.
- **No end-to-end tests.** The service layer is covered (see
  [Testing](#testing)); the React components and the tRPC routers above them
  are not.
