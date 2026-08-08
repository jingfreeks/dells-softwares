// unpair-device — Edge Function (Phase 3: device/register pairing)
//
// "Only an owner PIN can unpair it later" (per the reference design). The
// admin_unpair_device() RPC (security definer, run as the calling admin's
// own JWT so auth.uid()/auth_role() resolve correctly) validates the owner
// PIN and marks the devices row unpaired — but a pure SQL function can't
// revoke a live Supabase Auth session. This function does that immediate,
// real revocation step: after the RPC succeeds, it uses the service_role
// key to hard-delete the device's own auth user, killing its session right
// away. The `devices` row itself is never deleted (its id isn't an FK to
// auth.users), so it survives for audit exactly like a removed cashier's
// historical sales.cashier_id does today.

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

    let body: { deviceId?: string; ownerPin?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }

    const { deviceId, ownerPin } = body;
    if (!deviceId || !ownerPin) {
      return json({ error: "deviceId and ownerPin are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Bound by the caller's own JWT/RLS — admin_unpair_device() itself
    // re-checks auth_role() = 'admin' and the owner PIN server-side, this
    // client just carries the caller's identity into that RPC call.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { error: rpcError } = await callerClient.rpc("admin_unpair_device", {
      p_device_id: deviceId,
      p_owner_pin: ownerPin,
    });

    if (rpcError) {
      const message = rpcError.message.includes("INVALID_OWNER_PIN") ? "INVALID_OWNER_PIN" : rpcError.message;
      return json({ error: message }, 400);
    }

    // From here on, use the service_role client to immediately kill the
    // device's live session — the RPC above only marked it unpaired in
    // the database, it can't revoke a JWT itself.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(deviceId);
    if (deleteError) {
      // The device is already marked unpaired (RLS will lock it out on its
      // next request regardless), but log this so a lingering live
      // session until natural token expiry can be investigated.
      console.error("unpair-device: deleteUser failed:", deleteError.message);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
