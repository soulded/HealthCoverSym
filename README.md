# HealthCoverSim: Private Health Insurance Quote Simulator

A small full-stack web app for CSE3CWA Assignment 1. Users can create, view, edit and delete insurance quotes; for each quote the app calculates estimated monthly and yearly premiums from the cover type, hospital and extras tiers, applicant ages, Lifetime Health Cover (LHC) loading, the family upgrade fee, and the annual-payment discount, and explains every number in plain English.

| Component | Technology |
| ---       | ---|
| Frontend  | React 18 (Vite, React Router) |
| Backend   | Node.js + Express |
| Database  | SQLite (better-sqlite3) |
| Styling   | Plain CSS |

## Project structure

healthcoversim/
├── server/
│   ├── server.js            Express app + CRUD API routes
│   ├── quoteCalculator.js   ALL premium maths lives here (single source of truth)
│   ├── validation.js        Backend validation rules
│   ├── db.js                Opens SQLite and applies init.sql on startup
│   ├── init.sql             Database schema
├── client/
│   └── src/
│       ├── App.jsx                    Routing + layout
│       ├── api.js                     Fetch helpers
│       └── pages/
│           ├── QuoteList.jsx          List page (with delete)
│           ├── QuoteForm.jsx          Create + edit form (conditional Applicant 2)
│           └── QuoteDetail.jsx        Detail page + Explanation Sheet

## How to install and run

Requires Node.js 18+ (tested on Node 22). Run the backend and frontend in two terminals.

**Terminal 1 (backend port 3001):**
```bash
cd server
npm install
npm start
```

**Terminal 2 (frontend port 5173):**

```bash
cd client
npm install
npm run dev
```

The Vite dev server proxies every `/api` request to the backend (see `client/vite.config.js`)

## How the database is created

Starting the server is enough: `server/db.js` runs automatically, creates `server/healthcover.db` if it does not exist, and applies `server/init.sql`. The schema only uses `CREATE TABLE IF NOT EXISTS`, so restarting never touches existing data. To reset to an empty database, stop the server and delete `server/healthcover.db` (and its `-wal`/`-shm` files). You can also apply the schema manually with the SQLite CLI: `sqlite3 healthcover.db < init.sql`.

Only the raw quote **inputs** are stored (`id, customer_name, cover_type, applicant1_age, applicant1_cover_history, applicant2_age, applicant2_cover_history, hospital_cover, extras_cover, payment_frequency, annual_discount, notes, created_at`). The premium is recalculated every time a quote is displayed, so the pricing logic lives in exactly one place: `server/quoteCalculator.js`. `applicant2_age` and `applicant2_cover_history` are `NULL` for Single cover, and the calculator null-checks them before access.

## How the quote calculation works

```
adults        = 1 if Single else 2
for each adult:
    loading%  = 0                         if history == "Yes"
              = 0 (+ warning)             if history == "Not sure"
              = (age - 30) × 2%           if history == "No" and age > 30
              = 0                         if age ≤ 30
    loading%  = 0 always                  if hospital == "None"  ← nothing to load
    hospital_i = tier_price × (1 + loading%/100)
hospital = Σ hospital_i
extras   = extras_price × adults          // LHC no
fee      = 30 if Family else 0
monthly  = hospital + extras + fee
yearlyBefore = monthly × 12
yearlyAfter  = yearlyBefore × (1 - discount%/100)   // only when paying Yearly
```

All maths is in `server/quoteCalculator.js`

1. **Hospital, per adult:** tier price × (1 + that adult's LHC loading). Tier prices per adult per month: None $0, Basic $90, Bronze $120, Silver $160, Gold $220.
2. **LHC loading, per applicant** (hospital only, no extras): history *Yes* --> 0%; *No* --> (age - 30) × 2% when age > 30, else 0%; *Not sure* --> 0% applied plus a warning that the quote may be inaccurate. If hospital cover is None, the loading is 0% because there is nothing to load.
3. **Hospital total** = sum over adults (1 for Single, 2 for Couple/Family).
4. **Extras total** = extras tier price × adult count (None $0, Basic $25, Standard $45, Premium $70). LHC never applies here.
5. **Family upgrade fee** = flat $30/month, Family only, added automatically.
6. **Monthly premium** = hospital total + extras total + family fee.
7. **Yearly before discount** = monthly × 12. *Yearly after discount* = yearly × (1 - discount%), applied *only* when paying Yearly. Monthly payers never receive the discount.

Verified against the worked example (Family; A1 age 40/No --> 20% loading --> $192; A2 age 35/Yes --> $160; hospital $352 + extras $90 + fee $30 = *$472/month*; ×12 = *$5,664*; -5% = *$5,380.80*).

## How Family cover is calculated

Family cover counts **2 adults** - children are not priced individually. Each adult pays the hospital tier price with **their own** LHC loading calculated separately from their own age and history, plus the extras tier price. On top of that, a flat **$30/month family upgrade fee** is added once, automatically (the user never enters it); it covers dependent children under the one policy. There is no couple or family discount - the only discount in the simulator is the annual-payment discount, and only for yearly payers.

## Validation

The frontend blocks invalid quotes before submission; the backend independently re-validates every request, because users can send data straight to the API. Rules: customer name required; cover selections required (hospital and extras cannot both be None); ages must be whole numbers 18–100; Applicant 2 age **and** history required for Couple/Family (and forced to NULL for Single); discount 0–10%; "Not sure" history triggers a per-applicant inaccuracy warning instead of a guessed loading. Invalid input returns HTTP 400 with a list of readable messages - never a 500 crash - and malformed JSON is caught too.

## AI use statement

I used AI and some VScode extensions (Prettier, ESLint, SQLViewer, autorenametag etc.) to generate some of the starter code for the Express routes and React components, also to beautify some parts. Grammarly, QUilbot was used for a some touch up for README. I personally worked through and verified the pricing logic in quoteCalculator.js against the Section 7 worked example by hand, created psuedocodes, used material colour and styled the UI. Decision/s I made myself: Not showing the "Not sure" warning when Extras Cover is selected since LHC is only applicable to Hospital Cover. Recalculating premiums on display instead of storing calculated results.