// create-cashier — Edge Function (story C4: "Admin creates a Cashier login")
//
// Why this can't be done from the browser: creating another person's auth
// account requires Supabase's admin API, which needs the service_role key.
// That key must never reach client code (it bypasses every RLS policy in
// the database), so this one privileged action lives here instead, where
// the service_role key stays server-side.
//
// Flow:
//   1. Verify the caller is signed in AND is an admin of a store (checked
//      against their own JWT via the anon-key client, which is still bound
//      by RLS — an admin can only prove they're an admin of their OWN
//      store this way, never anyone else's).
//   2. Use the service_role client to create the new auth user. This also
//      fires the same handle_new_user trigger that self-registration uses,
//      which — because it always creates a brand-new store for any new
//      auth.users row — leaves the new cashier attached to a throwaway
//      store rather than the admin's real one.
//   3. Delete that throwaway store (cascades to the throwaway staff row)
//      and insert the correct staff row pointing at the admin's real
//      store_id with role 'cashier'. This correction step only ever runs
//      inside this trusted function, so a client can never forge its own
//      store_id to attach itself to someone else's store.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const { name, email, password } = await req.json();
    if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
      return json(
        { error: "name, email, and a password of at least 6 characters are required" },
        400
      );
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

    if (staffError || !callerStaff || callerStaff.role !== "admin") {
      return json({ error: "Only an admin can create cashier accounts" }, 403);
    }

    const storeId = callerStaff.store_id;

    // From here on we use the service_role client, which bypasses RLS —
    // every step below is scoped explicitly to storeId, never trusting
    // anything from the request body for authorization.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Could not create the account" }, 400);
    }

    const newUserId = created.user.id;

    // The trigger just gave this user a throwaway store as its admin.
    // Find and remove it, then attach them to the real store as a cashier.
    const { data: throwawayStaff } = await adminClient
      .from("staff")
      .select("store_id")
      .eq("id", newUserId)
      .single();

    if (throwawayStaff?.store_id) {
      await adminClient.from("stores").delete().eq("id", throwawayStaff.store_id);
      // ^ cascades and deletes the throwaway staff row too
    }

    const { error: insertError } = await adminClient.from("staff").insert({
      id: newUserId,
      store_id: storeId,
      name,
      email,
      role: "cashier",
    });

    if (insertError) {
      // Roll back the orphaned auth user rather than leave a broken account
      await adminClient.auth.admin.deleteUser(newUserId);
      return json({ error: insertError.message }, 400);
    }

    return json({ id: newUserId, name, email, role: "cashier" }, 201);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
