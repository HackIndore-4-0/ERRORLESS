# Supabase — what's done, what's left

## Done (by Claude, live in your Supabase account)

- Project created: **hackindore-humai**, region `ap-south-1`, org `oyrfcasvrvoacyyktqeo`
- Project ref: `slnjwippqantlevrvrgt`
- URL: `https://slnjwippqantlevrvrgt.supabase.co`
- `db/schema.sql` applied — tables `employees`, `tasks`, `approvals`, `audit_log` all exist
- `.env.example` pre-filled with the real `SUPABASE_URL`

## Left for you — one thing, can't be automated

**Get the service role key** (a secret — no API hands this out programmatically, on purpose):

1. Go to https://supabase.com/dashboard/project/slnjwippqantlevrvrgt/settings/api
2. Under "Project API keys" → `service_role` → click to reveal → copy it
3. Paste it into `SUPABASE_SERVICE_ROLE_KEY` in your `.env` (after copying `.env.example` → `.env`)
4. Set the same value in Railway's Variables tab once you deploy

## Security note — read before adding a frontend that talks to Supabase directly

Row Level Security (RLS) is currently **disabled** on all 4 tables. Right now
this is low-risk because only your backend touches the database, using the
service role key (which bypasses RLS regardless — enabling it wouldn't change
backend behavior). But if you later add a frontend that reads Supabase
directly with the anon/publishable key (e.g. for live dashboard updates), an
anon key with RLS off can read *and write* every row in every table.

Before that happens, run this in the Supabase SQL Editor:

```sql
ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;
```

Then add explicit policies for what the anon role may read (see the
`firestore.rules`-equivalent pattern from earlier in this project — read-only
for clients, all writes through the backend). Don't just run the `ALTER
TABLE` lines alone — that blocks ALL access, including your own backend
reads through the anon key if you ever use one; policies have to go with it.
I didn't apply this automatically since it changes access behavior and
you should decide the exact policies.
