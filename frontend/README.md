# HUMAI — Human + AI

**Decide what deserves a human.**

HUMAI is a decision layer between incoming work and the person or AI that handles it. It decides whether each task should be handled by **AI**, a **Human**, **both (Hybrid)**, or **Refused** — then continues monitoring assigned work so important tasks do not get stuck.

This repository contains the **frontend** (React + Vite + Tailwind CSS). It connects to the existing HUMAI backend.

---

## Tech Stack

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- Lucide React icons

## Getting Started (local)

```bash
npm install
cp .env.example .env   # then edit .env and set VITE_HUMAI_API_URL
npm run dev
```

Open the printed local URL in your browser.

## Environment Variable

| Variable | Description |
| --- | --- |
| `VITE_HUMAI_API_URL` | The full URL of your HUMAI backend (e.g. your Railway deployment URL). |

This is a **Vite client-side env var** — it must be prefixed with `VITE_` and set at build time, so configure it in your hosting platform's project settings (not at runtime).

## Build

```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint
npm run typecheck
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo in [Vercel](https://vercel.com).
3. Framework preset is auto-detected as **Vite** (a `vercel.json` is included).
4. In **Project → Settings → Environment Variables**, add:
   - `VITE_HUMAI_API_URL` → your Railway backend URL
5. Deploy.

## Connect to Railway (backend)

1. Deploy the HUMAI backend on [Railway](https://railway.app).
2. Copy the generated Railway public URL (e.g. `https://humai-backend.up.railway.app`).
3. Set that URL as the value of `VITE_HUMAI_API_URL` in your Vercel project settings.
4. Redeploy the frontend so the variable is baked into the build.

## Features

- **Overview** — control room with live metrics, flow diagram, and challenge explanations
- **Task Intake** — submit a task and see HUMAI's decision (AI / Human / Hybrid / Refused)
- **Work Status** — live SLA countdowns, claim & progress buttons, cascade and emergency alerts
- **Approval Inbox** — approve, edit & approve, or reject AI draft work
- **Team** — employee workload with the visible 85% capacity ceiling
- **Rework & Learning** — where humans are correcting AI
- **Audit** — recorded actions and backend health
- **Settings** — workspace, profile, and demo mode

Demo mode can be enabled from Settings to explore the interface without a backend.

---

HUMAI — Human + AI. Decide what deserves a human.
