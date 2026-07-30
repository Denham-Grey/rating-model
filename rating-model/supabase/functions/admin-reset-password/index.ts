import { corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/admin_guard.ts";

function generateTempPassword(): string {
  const alphabet =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*-_+=";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return withCors({ error: "Method not allowed." }, 405);

  const guard = await requireAdmin(req);
  if (!guard.ok) return withCors({ error: guard.error }, guard.status);
  const { admin } = guard;

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return withCors({ error: "Invalid JSON body." }, 400);
  }

  const userId = body.userId;
  if (!userId) return withCors({ error: "userId is required." }, 400);

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("username, email")
    .eq("id", userId)
    .maybeSingle();
  if (profileErr) return withCors({ error: profileErr.message }, 500);
  if (!profile) return withCors({ error: "No such user." }, 404);

  const temporaryPassword = generateTempPassword();

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
    password: temporaryPassword,
  });
  if (updateErr) return withCors({ error: updateErr.message }, 500);

  const { error: flagErr } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", userId);
  if (flagErr) return withCors({ error: flagErr.message }, 500);

  return withCors({ username: profile.username, email: profile.email, temporary_password: temporaryPassword });
});
