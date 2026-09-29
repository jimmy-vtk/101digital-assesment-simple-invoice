# SimpleInvoice

A full-stack invoicing app built for the 101 Digital Full Stack assessment: **ReactJS + TypeScript** frontend, **NestJS + TypeScript** REST API and **PostgreSQL**.

Users sign in, browse invoices (search, filter, sort, paginate), open an invoice's details, and create new invoices whose totals are calculated by the server.

---

## Contents

- [Quick start (Docker)](#quick-start-docker)
- [Reviewer login](#reviewer-login)
- [Ports](#ports)
- [Architecture](#architecture)
- [Running without Docker](#running-without-docker)
- [Database seeding](#database-seeding)
- [Configuration](#configuration)
- [API](#api)
- [Testing](#testing)
- [Design decisions and assumptions](#design-decisions-and-assumptions)
- [Known limitations](#known-limitations)

---

## Quick start (Docker)

Requires Docker with Compose v2.

```bash
git clone https://github.com/jimmy-vtk/101digital-assesment-simple-invoice.git
cd 101digital-assesment-simple-invoice
docker compose up --build        # legacy Compose: docker-compose up --build
```

Then open **http://localhost:8080**.

On first start the backend waits for PostgreSQL, applies migrations and seeds the reviewer account plus sample invoices, then the web app starts. No `.env` file is needed. Every setting has a working default, and all of them can be overridden (see [Configuration](#configuration)).

```bash
docker compose down        # stop (data is kept in the db-data volume)
docker compose down -v     # stop and delete the data; the next start re-seeds
```

## Reviewer login

| Email | Password |
| --- | --- |
| `reviewer@simpleinvoice.dev` | `Password123!` |

These are demo credentials, set by `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`. The seed resets this account's password to the configured value each time it runs.

## Ports

| Service | URL | Purpose |
| --- | --- | --- |
| Web app | http://localhost:8080 | React SPA served by nginx; `/api/*` is proxied to the backend |
| API | http://localhost:3000 | NestJS REST API |
| API docs | http://localhost:3000/api/docs | Swagger UI (OpenAPI JSON at `/api/docs-json`) |
| PostgreSQL | `localhost:5433` | Published for local development. **5433** avoids clashing with a locally installed Postgres on 5432 |

Change them with `WEB_PORT`, `API_PORT` and `DB_HOST_PORT`. If you change `WEB_PORT`, also set `CORS_ORIGIN` to match. The web app reaches the API through its same-origin proxy, but direct API calls from another origin need CORS.

When running without Docker: API on `3000`, Vite dev server on `5173`.

---

## Architecture

```
                   ┌──────────────────────────── docker compose ─────────────────────────────┐
 Browser ──:8080──►│ frontend (nginx)                                                        │
                   │  • serves the built React SPA                                           │
                   │  • /api/* ──proxy──► backend (NestJS) ──TypeORM──► db (PostgreSQL 16)    │
 Browser ──:3000──►│                        • /auth, /invoices, /health, /api/docs           │
                   └─────────────────────────────────────────────────────────────────────────┘
```

**Repository layout: monorepo.** One repository with `frontend/` and `backend/` keeps the stack versioned together, gives reviewers a single clone and lets one `docker-compose.yml` start everything.

```
.
├── backend/                  NestJS API
│   ├── src/
│   │   ├── auth/             login, /auth/me, JWT strategy, global guard, @Public()
│   │   ├── users/            user entity + lookup
│   │   ├── invoices/         entities, DTOs, service, controller, calculator, status rules
│   │   ├── database/         TypeORM config, migrations, seed, migrate script
│   │   ├── common/           exception filter, validators, utilities
│   │   ├── health/           GET /health (API + DB)
│   │   └── config/           environment validation
│   ├── test/                 e2e tests (real PostgreSQL via Testcontainers)
│   └── Dockerfile
├── frontend/                 React SPA
│   ├── src/
│   │   ├── api/              typed API client (axios) and endpoints
│   │   ├── auth/             token storage, auth context, protected routes
│   │   ├── pages/            Login, Invoice list, Invoice detail, Create invoice
│   │   ├── invoices/         list filters/table/cards, URL state, form schema
│   │   ├── components/       layout, status chip
│   │   └── test/             MSW fake backend, render helpers
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

### Backend

- **NestJS 11** (CommonJS) with **TypeORM 0.3** and **PostgreSQL 16**. Feature modules: `auth`, `users`, `invoices`, plus `health`.
- **Security by default:** a global JWT guard protects every route unless it is marked `@Public()` (only `POST /auth/login` and `GET /health`). Passwords are hashed with bcrypt. Login is rate-limited (10 attempts per minute per client) and Helmet sets security headers.
- **Validation:** a global `ValidationPipe` (class-validator and class-transformer) with `whitelist` and `forbidNonWhitelisted`. Unknown fields, including client-sent totals or `status`, are rejected.
- **Errors:** a global exception filter returns `{ statusCode, message, error }` for every error. Unexpected errors become a generic 500, so SQL and stack traces never leak.
- **Schema** is managed by migrations (`synchronize` is off). It has a unique constraint on `invoice_number`, CHECK constraints (due date ≥ invoice date, non-negative amounts, `balance = total − paid`, positive quantity and rate), B-tree indexes for filter and sort columns, and `pg_trgm` GIN indexes so `ILIKE '%keyword%'` searches can use an index.

### Frontend

- **React 19 + TypeScript** built with **Vite**, **MUI 9** components, **TanStack Query** for server state, **React Router 7**, **react-hook-form + zod** for forms.
- **List state lives in the URL** (`?status=Overdue&sortBy=totalAmount&page=2`), so it survives refreshes, can be shared as a link and works with Back/Forward. Search is debounced.
- **Responsive:** a sortable table on desktop and cards on phones. The layout follows the system's light or dark mode.
- **Auth:** the JWT is kept in `localStorage` with its expiry and sent as `Authorization: Bearer …`. Any `401` clears the session and returns the user to the login page, and after signing in they go back to the page they wanted.
- Signed-in pages are lazy-loaded, so the login screen loads less code.

---

## Running without Docker

Prerequisites: **Node.js ≥ 22.12** and **PostgreSQL** (any recent version; 13+ is needed for `gen_random_uuid()`). The simplest way to get the database is to start only that service with Docker:

```bash
docker compose up -d db          # PostgreSQL on localhost:5433, user/password/db = simpleinvoice
```

### Backend (http://localhost:3000)

```bash
cd backend
cp .env.example .env             # defaults match the compose database above
npm ci
npm run seed                     # applies migrations, then seeds (safe to re-run)
npm run start:dev                # watch mode; or: npm run build && npm run start:prod
```

To use your own PostgreSQL instead, edit `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` and `DB_NAME` in `backend/.env`.

### Frontend (http://localhost:5173)

```bash
cd frontend
cp .env.example .env             # optional: defaults work
npm ci
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:3000`, so the browser talks to one origin, just as it does through nginx in Docker.

---

## Database seeding

```bash
cd backend && npm run seed
```

- Applies any pending migrations first, so it works on an empty database.
- Upserts the reviewer account from `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_FULLNAME`.
- Inserts the **Appendix A mock invoice** (`IV1780488206995`) exactly as given, except its status (see [assumptions](#design-decisions-and-assumptions)).
- Inserts **40 generated invoices** with a mix of statuses, currencies (AUD, USD, SGD, GBP), tax rates, discounts, amounts and 12 customers. Dates are relative to today, so a fresh seed always includes upcoming, recently issued and overdue invoices. The 40 split roughly into 11 Paid, 8 Pending, 7 Draft and 14 Overdue; with the Appendix A invoice there are 41 in total and 15 Overdue. Generation uses a fixed random seed, so the data is the same on every run.
- **Idempotent:** re-running inserts only what is missing (matched by invoice number). Totals are computed with the same calculator the API uses.

In Docker, the seed runs on every backend start. Set `SEED_ON_START=false` to disable it.

---

## Configuration

All environment-specific values come from environment variables. Nothing sensitive is hard-coded, and the backend validates its environment at startup and refuses to start if something is missing or invalid.

| File | Used by |
| --- | --- |
| `.env.example` (root) | Optional overrides for `docker compose` (ports, DB credentials, JWT, seed account) |
| `backend/.env.example` | Backend when run with `npm` |
| `frontend/.env.example` | Frontend dev server / build |

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | API port |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | required | PostgreSQL connection |
| `JWT_SECRET` | required | At least 32 characters |
| `JWT_EXPIRES_IN` | `3600` | Access-token lifetime in seconds |
| `CORS_ORIGIN` | any origin | Comma-separated allowed origins |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_FULLNAME` | required / required / `Reviewer` | Reviewer account created by the seed |
| `SEED_ON_START` | `true` | Docker only: run the seed on container start |
| `VITE_API_BASE_URL` | `/api` | Frontend: API base URL seen by the browser |
| `VITE_DEV_API_PROXY_TARGET` | `http://localhost:3000` | Frontend dev only: where Vite proxies `/api` |

`docker-compose.yml` ships development defaults, including a JWT secret, so that `docker compose up` needs no setup. **Override `JWT_SECRET`, `DB_PASSWORD` and the seed password for any shared deployment.**

---

## API

Interactive documentation: **http://localhost:3000/api/docs**. It covers request bodies, query parameters, response schemas and status codes. Click **Authorize** and paste the `accessToken` from `POST /auth/login`.

| Method | Endpoint | Auth | Description |
| --- | --- | :-: | --- |
| POST | `/auth/login` | ✗ | Authenticate, returns `{ accessToken, tokenType, expiresIn }` |
| GET | `/auth/me` | ✓ | Current user profile |
| GET | `/invoices` | ✓ | List with search, filter, sort, pagination |
| GET | `/invoices/:id` | ✓ | Invoice detail (items, totals, balance) |
| POST | `/invoices` | ✓ | Create an invoice (always `Draft`) |
| GET | `/health` | ✗ | API and database health |

`GET /invoices` query parameters: `page` (default 1), `pageSize` (default 10, max 100), `sortBy` (`invoiceDate` \| `dueDate` \| `totalAmount`, default `invoiceDate`), `ordering` (`ASC` \| `DESC`, default `DESC`), `status` (`Draft` \| `Pending` \| `Paid` \| `Overdue`), `keyword` (partial, case-insensitive match on invoice number or customer name), `fromDate` / `toDate` (`YYYY-MM-DD`, applied to the invoice date).

```bash
TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"reviewer@simpleinvoice.dev","password":"Password123!"}' | jq -r .accessToken)

curl -s "localhost:3000/invoices?status=Overdue&sortBy=totalAmount&ordering=DESC&pageSize=5" \
  -H "Authorization: Bearer $TOKEN"
# { "data": [...], "paging": { "page": 1, "pageSize": 5, "total": <number of overdue invoices> } }
```

Error format (all endpoints):

```json
{ "statusCode": 400, "message": ["dueDate must be on or after invoiceDate"], "error": "Bad Request" }
```

| Status | When |
| --- | --- |
| 400 | Validation failed, malformed JSON or id, discount larger than subtotal + tax |
| 401 | Missing, invalid or expired token; wrong credentials |
| 404 | Invoice not found |
| 409 | Invoice number already exists |
| 429 | Too many login attempts |

### Business rules

```
subTotal      = Σ quantity × rate
taxAmount     = subTotal × taxRate / 100        (taxRate defaults to 10)
totalAmount   = subTotal + taxAmount − discount  (discount defaults to 0)
balanceAmount = totalAmount − totalPaid
```

- Totals are computed **only on the server**, using decimal arithmetic (`decimal.js`, rounded half-up to 2 places) rather than JavaScript floats. Amounts are stored as `NUMERIC(14,2)`.
- **Overdue is derived, never stored.** The database enum contains only `Draft`, `Pending` and `Paid`. An invoice that is not Paid and whose due date is before today is returned as `Overdue`. The status filter uses the same rule inside the SQL query, so filtering and pagination totals stay correct.
- **Invoice numbers are unique at the database level.** The API maps the constraint violation to `409`, which also holds for concurrent requests (covered by a test).
- **Due date ≥ invoice date** is validated in the DTO and also enforced by a database CHECK constraint.

---

## Testing

| Suite | Command | What it covers |
| --- | --- | --- |
| Backend unit (48) | `cd backend && npm test` | Invoice calculator (Appendix A totals, rounding, decimal precision, discount limits), Overdue derivation, DTO validation incl. due-date rule, service (Draft status, unique-number → 409), auth service, exception filter, utilities |
| Backend e2e (31) | `cd backend && npm run test:e2e` | Real Nest app and **real PostgreSQL in Docker** (Testcontainers) with real migrations: auth and guards, create → appears in list → detail, uniqueness incl. a concurrent race, validation errors, Overdue filtering, pagination, sorting, date range, LIKE-wildcard escaping; plus the **seed script and Appendix A data** checked end to end through the API |
| Frontend (38) | `cd frontend && npm test` | Vitest + Testing Library + MSW (fake API at the network layer), rendering the whole app: login, redirects and logout, 401 handling, list search/filter/sort/paging/page size/URL state/Back button/empty/error/mobile layout, detail (Appendix A values, 404), create form (validation, success + notification + redirect, 409 and server errors on fields), formatting and mapping helpers |

The backend e2e suite needs Docker running. Other checks: `npm run lint` (oxlint) and `npm run build` in each package.

The full stack was also verified by hand in Chrome through `docker compose` and the dev servers: every screen, the create flow checked against the database, the phone-width layout, and logout.

---

## Design decisions and assumptions

- **Monorepo** (see [Architecture](#architecture)).
- **Customer is embedded** in the `invoices` table (`customer_fullname`, `customer_email`, …) rather than stored in a separate `customers` table. An invoice is a snapshot: later edits to a customer must not change issued invoices. It also keeps search on customer name to a single indexed table.
- **Discount is a flat amount**, not a percentage. The spec's formula subtracts it directly and Appendix A confirms it (2000 + 200 − 20 = 2180). A discount larger than subtotal + tax is rejected.
- **Tax rate is stored** (`tax_rate`), in addition to the spec's `totalTax`, so invoice totals can be re-checked later.
- **Appendix A's `"status": "Overdue"`** is seeded as `Pending`, because Overdue must never be stored. The API still returns it as Overdue, since its due date (2026-07-03) has passed. All other mock values are kept, including the partial payment of 1451.34. The mock's `type` and `invoiceGrossTotal` fields are not part of the specified data model and are not stored.
- **Response paging shape** follows section 2.3.1 (`page`, `pageSize`, `total`), not Appendix A (`pageNumber`, `totalRecords`).
- **"Today" for Overdue is the UTC date.** Dates are `DATE` columns handled as `YYYY-MM-DD` strings end to end, so they never shift with timezones.
- **`fromDate` / `toDate` filter on the invoice date.**
- **Every signed-in user sees all invoices.** The spec does not ask for per-user ownership; `createdBy` records the creator.
- **Currency symbol** is stored with the invoice (`AU$`, `US$`, `£`, …), taken from the ISO 4217 code. The form offers AUD, USD, GBP, EUR, SGD, NZD, JPY and VND, and the API accepts any valid ISO 4217 code.
- **Tax rate** is limited to 0–100%, and money inputs to 2 decimal places.
- **JWT in `localStorage`** with a Bearer header. It is simple and matches the spec's wording. The trade-off is exposure to XSS; React escapes output and there is no `dangerouslySetInnerHTML`. An httpOnly cookie would be the next step up.
- **NestJS 11 rather than 12:** Nest 12 packages are ESM-only, and Jest can only load them on Node ≥ 24.9. Nest 11 keeps the project runnable and testable on Node 22 and 24.
- **Behind nginx**, the API trusts `X-Forwarded-For` from private-network proxies, so the login rate limit applies per client rather than to the proxy.

## Known limitations

- **No status or payment updates:** there are no endpoints to record a payment or change status. Pending and Paid invoices, and non-zero `totalPaid`, come from seed data only.
- **One line item per invoice** in the API and form, as the spec requires. The data model and calculator already support several.
- **Sorting by total compares raw numbers across currencies.** The spec defines no exchange rates.
- **No refresh tokens:** the session ends when the access token expires (default 1 hour) and the user signs in again.
- **Rate limiting is in memory**, so it is per API instance. Clients inside the private network could spoof `X-Forwarded-For`; public clients cannot.
- **Frontend tests use a fake API (MSW), not a browser-automation suite** such as Playwright. The real stack was verified manually.
- **No update, delete or list-of-users endpoints**, and no user registration. They are out of scope.
