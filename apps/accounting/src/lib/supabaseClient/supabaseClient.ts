import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project's values."
  );
}

/**
 * The same Supabase project the POS uses -- deliberately.
 *
 * Accounting owns no identity of its own. A person signs in once to Dell's
 * Softwares and this app inherits that session, exactly as the Platform
 * Console does. Pointing it at a second project, or issuing it a second
 * account, would make "sign in with your Tindahan POS account" a promise
 * nothing keeps.
 *
 * Safe to expose client-side: the anon key grants only what Row Level Security
 * allows the signed-in user, and the accounting schema is not exposed to
 * PostgREST at all -- every read goes through a public function.
 */
export const supabase = createClient(url, anonKey);
