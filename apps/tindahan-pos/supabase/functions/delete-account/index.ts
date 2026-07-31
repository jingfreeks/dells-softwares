// delete-account — Edge Function (privacy: "the user can delete their account")
//
// Why this can't be done from the browser: deleting an auth.users row
// requires Supabase's admin API, which needs the service_role key. That key
// must never reach client code (it bypasses every RLS policy in the
// database), so this privileged action lives here instead, where the
// service_role key stays server-side.
//
// Flow:
//   1. Verify the caller is signed in and look up their OWN staff row
//      (checked against their own JWT via the anon-key client, still bound
//      by RLS — a caller can only ever prove facts about themselves this
//      way).
//   2. If they're an admin, block deletion when they're the store's only
//      admin — deleting the last admin would orphan the store (nobody left
//      to manage inventory/staff/reports). They're told to promote another
//      staff member to admin first.
//   3. Otherwise, delete their auth.users row via the service_role admin
//      API. staff.id references auth.users(id) on delete cascade, so their
//      staff row is removed automatically. sales.cashier_id,
//      credit_payments.created_by, and receiving_entries.created_by all
//      relax to null on delete (0016_account_deletion.sql) — the store's
//      own financial/business records are never destroyed by one person
//      leaving.

import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
  if (allowedOrigins.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Bound by RLS: this only tells us the truth about the CALLER's own
    // staff row, never anyone else's.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return json({ error: "Invalid session" }, 401);
    }

    const { data: callerStaff, error: staffError } = await callerClient
      .from("staff")
      .select("store_id, role")
      .eq("id", caller.id)
      .single();

    if (staffError || !callerStaff) {
      return json({ error: "Could not find your staff record." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (callerStaff.role === "admin") {
      const { count, error: countError } = await adminClient
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("store_id", callerStaff.store_id)
        .eq("role", "admin")
        .neq("id", caller.id);

      if (countError) {
        return json({ error: countError.message }, 400);
      }
      if (!count || count === 0) {
        return json(
          {
            error:
              "You're the only admin for this store. Promote another staff member to admin before deleting your account.",
          },
          400
        );
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(caller.id);
    if (deleteError) {
      console.error("delete-account: deleteUser failed:", deleteError.message);
      return json({ error: "Could not delete your account. Try again." }, 500);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
