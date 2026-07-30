import { corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/admin_guard.ts";

const VALID = new Set(["active", "suspended", "inactive"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return withCors({ error: "Method not allowed." }, 405);

  const guard = await requireAdmin(req);
  if (!guard.ok) return withCors({ error: guard.error }, guard.status);
  const { admin } = guard;

  let body: { userId?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return withCors({ error: "Invalid JSON body." }, 400);
  }

  const userId = body.userId;
  const status = body.status;
  if (!userId) return withCors({ error: "userId is required." }, 400);
  if (!status || !VALID.has(status)) {
    return withCors({ error: "status must be 'active', 'suspended', or 'inactive'." }, 400);
  }

  const { data, error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", userId)
    .select("id, full_name, username, role, status")
    .maybeSingle();

  if (error) {
    // The last-admin-lockout trigger only guards role changes/deletes, so
    // this error path is for unexpected DB failures, not lockout attempts.
    return withCors({ error: error.message }, 500);
  }
  if (!data) return withCors({ error: "No such user." }, 404);

  return withCors({ user: data });
});
