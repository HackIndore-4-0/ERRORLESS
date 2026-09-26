# HUMAI Backend

AI/human task allocation engine — Node.js/Express + Supabase + Groq.

## Local setup
```bash
npm install
cp .env.example .env   # fill in Supabase, Groq, Gmail values
npm run dev
```

## Deploying on Railway
1. Push this repo to GitHub.
2. In Railway: **New Project → Deploy from GitHub repo** → select this repo.
3. Railway auto-detects Node.js from `package.json` and runs `npm start`.
4. In the Railway project → **Variables** tab, add every key from `.env.example`
   with your real values (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `GROQ_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `APP_URL`). Do **not**
   commit `.env` — it's git-ignored on purpose.
5. Railway assigns a public URL once deployed — check it with `GET /health`.
6. Once your Vercel frontend has its own URL, update `APP_URL` here so
   assignment emails link to the right place.
