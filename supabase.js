import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env — " +
      "the server will still start, but any request touching the database will fail " +
      "until these are set."
  );
}

// createClient() throws synchronously on an empty/invalid URL, which would crash
// the whole process at boot. Fall back to a syntactically-valid placeholder so the
// server can still start (e.g. to serve /health) — real DB calls will simply fail
// with a clear connection error until the real values are set.
export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);
