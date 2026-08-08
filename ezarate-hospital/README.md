# ezarate-hospital (frontend)

React 19 + Vite single-page app for the **E. Zarate Hospital** system — a self-hosted
Electronic Medical Records (EMR) and hospital operations platform. Talks exclusively
to the [hospital-backend](../hospital-backend) Spring Boot API over REST; no
third-party service (Supabase or otherwise) is used.

> Full technical reference lives in the companion **Technical Documentation**.
> Deployment/ops procedures live in the **Operations & Deployment Runbook**. Feature
> walkthroughs for hospital staff live in the **End-User Manual**. This README covers
> just what you need to get the frontend running locally.

## 1. Prerequisites

- Node.js + npm
- The backend running (see `hospital-backend/README.md`) — this app has nothing
  useful to show without it

## 2. Setup

```bash
npm install
```

Create a `.env` file (or copy `.env.example` if present) with:

```
VITE_API_BASE_URL=http://localhost:8080
```

Point this at wherever the backend is actually reachable from — `localhost:8080` for
local dev, a server hostname/IP for a deployed backend. This is a **build-time**
value — changing it requires restarting `npm run dev` or rebuilding, not just a page
refresh.

## 3. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot module reload, default `http://localhost:5173` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serves the production build locally, default `http://localhost:4173` |
| `npm run lint` | ESLint |

Day-to-day local use is typically `npm run build && npm run preview` — see the Ops
Runbook for why (matches the backend's CORS allowlist, and is what the one-click
`start-ezarate.bat` launcher can be configured to use instead of dev mode).

## 4. Folder Structure

```
src/
├── data/         roles.js (role → feature access matrix, single source of truth for
│                 what each role can see), navigation.js (sidebar), icd10Codes.js,
│                 rvsCodes.js
├── lib/          apiClient.js — the single wrapper around fetch() for every backend
│                 call; returns { data, error }, mirroring the old Supabase-js
│                 response shape on purpose so call sites didn't need to change shape
├── utils/        one file per backend resource (patients.js, encounters.js,
│                 labOrders.js, consultations.js, ...) — each mirrors its backend
│                 controller's endpoints
├── context/      React context providers (auth, etc.)
├── routes/       route definitions
├── pages/        top-level pages, including pages/patient/ — the Patient Profile and
│                 every clinical form (Consultation Form, EMR, ER Discharge, Konsulta
│                 Referral, Medical Certificate, Medical Abstract, PDFs)
├── features/     feature-scoped pages/modals, organized by domain (encounters,
│                 lab-orders, medicine-prescriptions, admin, archive, ...)
├── components/   shared UI components
├── hooks/        shared React hooks
└── styles/       global styles (Tailwind entrypoint)
```

## 5. Access Control

The sidebar and route guards are driven entirely by `src/data/roles.js` — see that
file (or the Technical Documentation's Authorization section) before adding a new
page or changing what a role can see. The backend enforces the same rules
independently at the API layer, so the frontend list is a UX convenience, not the
actual security boundary.

## 6. Key Dependencies

| Package | Purpose |
|---|---|
| `react` / `react-dom` (19) | UI framework |
| `react-router-dom` (7) | Routing |
| `tailwindcss` (4) + `@tailwindcss/vite` | Styling |
| `@react-pdf/renderer` | PDF generation (consultation records, medical certificates, etc.) |
| `jspdf` | PDF generation (secondary use cases) |
| `xlsx` (SheetJS) | Spreadsheet export |
| `lucide-react` | Icons |

## 7. Remote Access (occasional, not routine)

For testing from a phone or demoing off-network without a full deployment, this
project supports Cloudflare quick tunnels — `vite.config.js` already sets
`allowedHosts: true` on both the dev and preview servers to allow the random
`trycloudflare.com` hostnames through. Full step-by-step procedure (wiring the tunnel
URLs into `CORS_ALLOWED_ORIGINS` and `VITE_API_BASE_URL` correctly) is in the
Operations & Deployment Runbook — don't leave tunnels running longer than needed;
they make the tunneled port reachable from the public internet for as long as they're
open.