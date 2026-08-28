// submit-demo-request — Edge Function (landing page "Book a demo" form)
//
// Anonymously-callable like pair-device: a landing-page visitor has no
// Supabase session at all. Validates required fields, rejects an obvious
// duplicate resubmission from the same mobile number within a short
// window, then inserts via the service_role client into a table with no
// anon/authenticated RLS policies at all -- this function is the only way
// in or out of public.demo_requests.

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

const DUPLICATE_WINDOW_MINUTES = 5;

interface DemoRequestBody {
  name?: string;
  businessName?: string;
  mobile?: string;
  email?: string;
  businessType?: string;
  locations?: string;
  message?: string;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    let body: DemoRequestBody;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body must be valid JSON" }, 400);
    }

    const name = body.name?.trim();
    const businessName = body.businessName?.trim();
    const mobile = body.mobile?.trim();
    const email = body.email?.trim() || null;
    const businessType = body.businessType?.trim();
    const locations = body.locations?.trim();
    const message = body.message?.trim() || null;

    if (!name || !businessName || !mobile || !businessType || !locations) {
      return json({ error: "Name, business name, mobile number, business type and locations are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const since = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60_000).toISOString();
    const { data: recent } = await adminClient
      .from("demo_requests")
      .select("id")
      .eq("mobile", mobile)
      .gte("created_at", since)
      .limit(1);

    if (recent && recent.length > 0) {
      return json({ error: "We already have your request -- we'll be in touch within one working day." }, 409);
    }

    const { error: insertError } = await adminClient.from("demo_requests").insert({
      name,
      business_name: businessName,
      mobile,
      email,
      business_type: businessType,
      locations,
      message,
    });

    if (insertError) {
      console.error("submit-demo-request: insert failed:", insertError.message);
      return json({ error: "Could not send your request. Try again." }, 500);
    }

    return json({ ok: true }, 201);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
