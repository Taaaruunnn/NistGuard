# NISTGuard

A cybersecurity risk assessment and gap analysis platform built on the **NIST
Cybersecurity Framework (CSF) 2.0**. Run a structured self-assessment across all
six CSF functions, get automated maturity scoring, gap analysis, and a
prioritised remediation list.

MEAN stack — MongoDB, Express, Angular 21 (standalone components + signals),
Node.js — with Tailwind CSS v4 and Chart.js.

---

## What it does

- Walks you through the **complete CSF 2.0 Core**: 6 Functions, 22 Categories,
  **106 Subcategories** — the real NIST taxonomy, not a simplified subset.
- Scores each subcategory on a 0–4 maturity tier against a **configurable
  target tier** (default: Repeatable).
- Rolls scores up to category, function and overall level.
- Derives **findings** from the gaps, each with a severity, a business-impact
  note and a recommendation built from NIST's own implementation examples.
- Ranks findings by **gap × business impact**, not severity alone.
- Produces a printable report with an executive summary, scorecard, findings
  register and a full response appendix.

### Where the taxonomy comes from

`backend/data/csf20-core.js` is **generated, not hand-written**. It is extracted
from NIST's own published workbook (the "CSF 2.0 Core with Implementation
Examples and Informative References" export behind
<https://www.nist.gov/cyberframework>). Withdrawn CSF 1.1 identifiers that NIST
keeps in the workbook as tombstones (`ID.AM-06`, the `ID.BE`/`PR.AC`/`DE.DP`
families, etc.) are excluded, leaving exactly the 106 live subcategories.

Per-function subcategory counts: GV 31, ID 21, PR 22, DE 11, RS 13, RC 8.

---

## Scoring methodology

Documented in full in `backend/services/scoring.js`. The short version:

**Roll-up.** Every score is an *unweighted arithmetic mean computed from the
subcategory leaves* — not a mean of means. A function's score is the mean of all
its answered subcategory tiers, **not** the mean of its category averages. This
matters because `GV.SC` has 10 subcategories and `GV.PO` has 2; averaging
category means would give the 2-subcategory category five times the
per-question influence, letting an organisation paper over a broad supply-chain
weakness by writing one good policy.

**Exclusions.** Unanswered subcategories are excluded from all means — they are
*not* counted as zero. Subcategories marked Not Applicable are excluded from the
means, the denominators and the findings. A partial assessment therefore reports
honestly rather than being padded down.

**Impact is not mixed into maturity.** Business impact describes consequence;
maturity describes practice. Mixing them would produce a score that cannot be
compared against anyone else's. Impact is applied only when prioritising
findings.

**Severity.** `severity = clamp(round(gap × impactWeight) − 1, 0, 3)` mapped onto
Low / Medium / High / Critical, where impact weights are Low 0.75, Moderate 1.0,
High 1.5, Critical 2.0. So a 1-tier gap on a Moderate control is Low, the same
gap on a Critical control is Medium, and a 3-tier gap on anything High or above
is Critical.

**Prioritisation.** `priority = gap × impactWeight`, descending. A Medium
finding on a business-critical subcategory outranks a High one on something
peripheral.

**Findings are a materialised view.** Auto findings are deleted and rebuilt
whenever responses or the target tier change. Manually flagged findings
(`source: 'manual'`) are never touched by regeneration.

---

## Running locally

Prerequisites: Node.js 20+ and a MongoDB connection string (Atlas or local).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in MONGO_URI and JWT_SECRET
npm run seed                # loads the CSF 2.0 taxonomy (idempotent)
npm run dev                 # http://localhost:5000
```

`npm run seed -- --wipe` additionally clears all assessments, responses and
findings. Without `--wipe` it only upserts the taxonomy, so existing user data
survives a re-seed.

Optionally load a realistic demo assessment so the dashboard and report have
something to show without answering 106 questions by hand:

```bash
npm run demo          # creates demo@nistguard.local / demopassword
npm run demo -- you@you.com yourpassword   # or attach it to your own account
```

Verify the whole API end to end (80 assertions, needs the server running):

```bash
npm run smoke
```

### 2. Frontend

```bash
cd frontend
npm install
npm start                   # http://localhost:4200
```

`src/app/core/api-config.ts` points at `http://localhost:5000/api` automatically
when served from localhost, and at the deployed API otherwise.

> **If `npm run seed` fails with `querySrv ECONNREFUSED`** your DNS resolver is
> refusing the SRV lookups that `mongodb+srv://` requires (some ISP and
> corporate resolvers do). Set `DNS_SERVERS=8.8.8.8,1.1.1.1` in `backend/.env`.
> This is a local-development workaround only — never set it in hosting.

---

## Project layout

```
backend/
  config/       db.js (cached, serverless-safe connection), tiers.js (shared vocabulary)
  data/         csf20-core.js  <- generated CSF 2.0 taxonomy
  models/       User, NistFunction, NistCategory, NistSubcategory,
                Assessment, Response, Finding
  services/     scoring.js     <- all scoring and gap analysis
  controllers/  auth, nist, assessment
  routes/       authRoutes, nistRoutes, assessmentRoutes
  middleware/   auth.js (JWT)
  scripts/      smoke-test.js
  seeder.js     server.js      vercel.json

frontend/src/app/
  core/         api-config.ts, csf.ts (function colours + glyphs),
                models/, services/, guards/, interceptors/
  shared/       icon.ts (the entire icon set), tier-meter.ts, chart.ts, shell.ts
  pages/        auth/ (login, register), dashboard/, assessment/, report/
```

---

## API

All routes are mounted under `/api`. Assessment routes require a bearer token.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Sign in |
| `POST` | `/auth/logout` | Clear the auth cookie |
| `GET` | `/auth/me` | Current user |
| `GET` | `/nist/functions` | The 6 functions |
| `GET` | `/nist/categories` | The 22 categories (`?function=GV`) |
| `GET` | `/nist/subcategories` | The 106 subcategories (`?function=`, `?category=`) |
| `GET` | `/nist/core` | Whole Core, nested, in one payload |
| `GET` | `/nist/meta` | Tier / impact / severity vocabulary |
| `GET` `POST` | `/assessments` | List / create |
| `GET` `PATCH` `DELETE` | `/assessments/:id` | Read / update / delete |
| `GET` `PUT` | `/assessments/:id/responses` | Read / upsert responses |
| `GET` | `/assessments/:id/scores` | Computed function and category scores |
| `GET` `POST` | `/assessments/:id/findings` | Computed gaps; flag one manually |
| `PATCH` | `/assessments/:id/findings/:findingId` | Update a finding's status |
| `GET` | `/assessments/:id/report` | Full report payload |

Auth is a JWT issued both as an `httpOnly` cookie and in the response body. The
bearer token is what actually carries the session in production, because the
frontend and backend sit on different domains where third-party cookies are
unreliable.

---

## Deploying to Vercel

Deploy as **two separate Vercel projects** from this one repository.

### Step 1 — backend

1. New Project → import this repo → set **Root Directory** to `backend`.
2. Add environment variables (Project Settings → Environment Variables):
   - `MONGO_URI` — your Atlas connection string
   - `JWT_SECRET` — a long random string
   - `NODE_ENV` — `production`
3. Deploy. Note the URL, e.g. `https://nistguard-api.vercel.app`.
4. Check `https://<your-api>/api/health` returns `{"status":"success",...}`.

`backend/vercel.json` routes everything to `server.js`, which exports the
Express app and only calls `app.listen` when run directly.

### Step 2 — seed the production database

The seeder is a local script; point it at the same database once:

```bash
cd backend
MONGO_URI="<your atlas uri>" npm run seed
```

### Step 3 — frontend

1. Edit `frontend/src/app/core/api-config.ts` and set `PRODUCTION_API` to your
   backend URL **including `/api`**. Commit and push.
2. New Project → import this repo → set **Root Directory** to `frontend`.
3. Deploy. `frontend/vercel.json` already sets the output directory and the SPA
   rewrite so deep links such as `/assessments/:id/report` resolve.

### ⚠️ MongoDB Atlas network access

Vercel's serverless functions connect from rotating IPs. In Atlas go to
**Network Access → Add IP Address → Allow Access from Anywhere (`0.0.0.0/0`)**
(or add Vercel's published ranges).

Without this the deploy succeeds and the site loads, but **every database call
times out** — which surfaces as a 503 from the API rather than an obvious
connection error.

---

## Design

The interface is deliberately styled as a printed audit report rather than a
generic admin dashboard: a warm paper ground, ink-coloured type, hairline rules
instead of drop shadows, square corners, section marks, and a single restrained
claret accent.

- **Type**: Fraunces (display) / IBM Plex Sans (body) / IBM Plex Mono (every CSF
  identifier, tier and figure).
- **Function identity**: each of the six functions owns a colour and a glyph,
  defined once in `core/csf.ts` and used everywhere it appears.
- **Icons**: the entire set is hand-drawn in `shared/icon.ts` on one 24×24 grid
  at a uniform 1.5 stroke. No icon library is used.
- **Pages as distinct moments**: the assessment walkthrough is a focused,
  form-like flow with a progress rail; the report is dense, multi-column and
  genuinely printable (`@media print` is handled).
