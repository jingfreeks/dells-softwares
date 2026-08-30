// approve-deletion-request — Edge Function (Super Admin console only)
//
// Approving a queued account-deletion request (see
// 20260815142000_account_deletion_requests.sql) means deleting the
// requesting admin's auth.users row, which — same constraint delete-account
// itself documents — needs the service_role Admin API and so cannot happen
// inside a plain Postgres function.
//
// Flow:
//   1. Verify the caller is signed in and is an ACTIVE platform admin with
//      a fresh (aal2, <8h) second factor, by calling public.platform_me()
//      with the CALLER'S OWN token — the same "ask the database to prove a
//      fact about this exact caller" pattern delete-account uses for the
//      staff-row lookup, rather than trusting anything the client asserts.
//      ENGINEER or SUPERUSER scope only, matching
//      platform_deny_deletion_request's own gate.
//   2. Look up the request (service_role) and refuse if it isn't PENDING —
//      most commonly because someone already resolved it.
//   3. Delete the requesting user's auth.users row via the Admin API.
//   4. Only once that succeeds: mark the request APPROVED and cancel the
//      organization (public.finalize_account_deletion, service_role). Doing
//      this after, not before, the Admin API call means a delete failure
//      never leaves a request reading APPROVED for an account that still
//      exists.

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

    let body: { requestId?: string; note?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    const requestId = body.requestId;
    if (!requestId) {
      return json({ error: "requestId is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Bound by the caller's own token/RLS: this can only ever tell us the
    // truth about whoever is holding this session, never anyone else's.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return json({ error: "Invalid session" }, 401);
    }

    const { data: meRows, error: meError } = await callerClient.rpc("platform_me");
    if (meError) {
      return json({ error: meError.message }, 400);
    }
    const me = meRows?.[0];
    const scopeAllowed = me?.scope === "ENGINEER" || me?.scope === "SUPERUSER";
    if (!me || !me.mfa_fresh || !scopeAllowed) {
      return json({ error: "Not authorized to approve account-deletion requests." }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: requestRows, error: fetchError } = await adminClient.rpc("get_deletion_request_for_approval", {
      p_request_id: requestId,
    });
    if (fetchError) {
      return json({ error: fetchError.message }, 400);
    }
    const request = requestRows?.[0];
    if (!request) {
      return json({ error: "Request not found." }, 404);
    }
    if (request.status !== "PENDING") {
      return json({ error: `This request was already ${request.status.toLowerCase()}.` }, 409);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(request.requested_user_id);
    if (deleteError) {
      console.error("approve-deletion-request: deleteUser failed:", deleteError.message);
      return json({ error: "Could not delete the account. Try again." }, 500);
    }

    const { error: finalizeError } = await adminClient.rpc("finalize_account_deletion", {
      p_request_id: requestId,
      p_resolved_by: caller.id,
      p_note: body.note ?? null,
    });
    if (finalizeError) {
      // The account is already gone at this point -- the goal was
      // achieved -- but the request/organization bookkeeping didn't
      // update. Surface this distinctly so the console can flag it for a
      // manual follow-up rather than reporting a clean success.
      console.error("approve-deletion-request: finalize_account_deletion failed:", finalizeError.message);
      return json(
        { ok: true, warning: "Account deleted, but updating the request record failed. Check the audit log." },
        200
      );
    }

    return json({ ok: true }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
