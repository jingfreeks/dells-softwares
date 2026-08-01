import "./polyfills";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import type { Database } from "./database.types";
import { largeSecureStore } from "./secureStorage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in the same Supabase project's values used by apps/tindahan-pos."
  );
}

// Safe to bundle client-side: the anon key only grants what Row Level
// Security policies in the database allow for the signed-in user. The
// session itself (access + refresh token) is persisted through
// largeSecureStore, not plain AsyncStorage — see secureStorage.ts.
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: largeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase's auto-refresh timer needs an explicit nudge on RN — it doesn't
// run while the app is backgrounded, so refresh must be kicked on foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
