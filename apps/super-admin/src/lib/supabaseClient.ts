import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project's values (the SAME project apps/tindahan-pos points at)."
  );
}

/**
 * Anon key only -- exactly like the tenant apps.
 *
 * This console holds no elevated key of any kind. Everything it can do
 * comes from an ACTIVE core.platform_admins row plus a second factor
 * verified in the last 8 hours, re-checked inside every platform_* RPC on
 * the server. A service_role key here would bypass all of that, which is
 * why it must never appear in this app (see .env.example).
 */
export const supabase = createClient(url, anonKey);
