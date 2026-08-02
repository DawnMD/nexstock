# Shelf Sync

An inbound warehouse management system (WMS). Shelf Sync covers the receiving
side of a warehouse: a purchase order arrives, a vehicle books a dock, the goods
are inspected and received against the order lines, stock is put away into a
storage location, and any discrepancies are corrected with adjustments.

## The inbound flow

```
Orders → Dock booking → Quality check → Receive → Putaway → Adjustments
```

| Step              | Route                                     | What happens                                                                                            |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Orders**        | `/orders`, `/orders/[orderNumber]`        | Purchase orders from vendors, each with line items (SKU + ordered quantity).                              |
| **Dock booking**  | `/dock-booking`                           | Book a vehicle onto a dock for an order. Activities track the vehicle: `CHECK_IN` → `OPEN` → `CLOSE` → `CHECK_OUT`. |
| **Quality check** | `/quality-check`                          | Inspect a line item once its container has been opened; record inspected and rejected quantities.          |
| **Receive**       | `/receive`                                | Receive stock against an order line. Each receipt creates a `ReceiveItem` with an LPN (pallet label), lot, UOM and a staging location. |
| **LPN list**      | `/lpn-list`                               | Browse what has been received, by order.                                                                  |
| **Putaway**       | `/putaway`, `/putaway/[lpn]`              | Move a received LPN from staging into a storage `Location`.                                               |
| **Adjustments**   | `/adjustments`                            | Record additions/subtractions against an order line to correct quantities.                                |
| **Dashboard**     | `/dashboard`                              | Order stats and today's dock schedule.                                                                    |

## Stack

- [Next.js 15](https://nextjs.org) (App Router, React 19, Turbopack in dev)
- [tRPC 11](https://trpc.io) + [TanStack Query](https://tanstack.com/query)
- [Prisma 6](https://prisma.io) on PostgreSQL
- [Clerk](https://clerk.com) for authentication
- [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (Radix primitives)

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9 (`corepack enable`)
- A PostgreSQL database
- A [Clerk](https://dashboard.clerk.com) application (free tier is fine)

### Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable                            | Description                                                          |
| ----------------------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`                      | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/shelf_sync`. |
| `CLERK_SECRET_KEY`                  | Clerk secret key (`sk_test_…`), from the Clerk dashboard → API Keys.  |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_…`), same page.                       |

The values shipped in `.env.example` are well-formed placeholders so that
`pnpm build` succeeds in CI; they will not authenticate against anything real.
Env vars are validated at startup by `env.js` — set `SKIP_ENV_VALIDATION=1` to
bypass that (useful for Docker builds).

### Setup

```bash
pnpm install        # also runs `prisma generate`
pnpm db:push        # push the Prisma schema to your database
pnpm db:seed        # load sample vendors, SKUs, orders, docks and receipts
pnpm dev            # http://localhost:3000
```

The seed is destructive and re-runnable: it clears every table before inserting,
so you can run it as often as you like to get back to a known state. It creates
50 vendors, 10 SKUs, 20 locations, 10 docks, 50 orders (10 line items each),
dock bookings with check-in/open activities for the first 20 orders, and
receipts against the first 12 — enough that every screen has data on first load.

## Scripts

| Script               | Description                                     |
| -------------------- | ----------------------------------------------- |
| `pnpm dev`           | Dev server with Turbopack.                       |
| `pnpm build`         | Production build (typechecks and lints).         |
| `pnpm start`         | Serve the production build.                      |
| `pnpm typecheck`     | `tsc --noEmit`.                                  |
| `pnpm lint`          | ESLint via `next lint`.                          |
| `pnpm format:check`  | Prettier check.                                  |
| `pnpm format:write`  | Prettier write.                                  |
| `pnpm db:push`       | Push schema without a migration (dev).           |
| `pnpm db:generate`   | Create and apply a migration (`prisma migrate dev`). |
| `pnpm db:migrate`    | Apply migrations (`prisma migrate deploy`).      |
| `pnpm db:seed`       | Reset and seed the database.                     |
| `pnpm db:studio`     | Prisma Studio.                                   |

CI (`.github/workflows/ci.yaml`) runs lint, Prettier, typecheck and build on
every pull request.

## Project layout

```
app/            App Router routes; the inbound screens live under app/(inbound)/
components/     React components; components/ui/ is shadcn
server/api/     tRPC routers (order, receive, quality-check, putaway, adjustments)
trpc/           tRPC client/server wiring and the React Query client
prisma/         schema.prisma, migrations, seed.ts
lib/            shared helpers
```

## Known limitations

- **No authorization.** Clerk authenticates users, but there is no role, org or
  tenant model. `privateProcedure` only checks that a user is signed in, so any
  signed-in user can read every order and mutate any booking, receipt, quality
  check, adjustment or putaway. Fine for a single-operator hobby deployment;
  this is the first thing to build before it goes multi-user.
- **No inventory model.** There is no stock-on-hand table. Received, rejected
  and put-away quantities live in separate tables that are not reconciled, so
  quantities can drift between screens.
- **Inbound only.** There is no picking, packing or shipping.
- **No tests.** There is no test runner configured yet.
