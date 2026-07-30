import { corsHeaders, withCors } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/admin_guard.ts";

function generateTempPassword(): string {
  // 20 chars from a large alphabet, crypto-random. Avoids characters that are
  // easy to misread when an admin reads it aloud/copies it (0/O, 1/l/I).
  const alphabet =
    "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*-_+=";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function baseUsername(email: string): string {
  const local = email.split("@")[0] || "user";
  return local.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40) || "user";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return withCors({ error: "Method not allowed." }, 405);

  const guard = await requireAdmin(req);
  if (!guard.ok) return withCors({ error: guard.error }, guard.status);
  const { admin } = guard;

  let body: { name?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return withCors({ error: "Invalid JSON body." }, 400);
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role;

  if (!name) return withCors({ error: "Full name is required." }, 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return withCors({ error: "A valid email address is required." }, 400);
  }
  if (role !== "analyst" && role !== "admin") {
    return withCors({ error: "Role must be 'analyst' or 'admin'." }, 400);
  }

  const { data: existing, error: existingErr } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingErr) return withCors({ error: "Could not validate email uniqueness." }, 500);
  if (existing) return withCors({ error: "An account with that email already exists." }, 409);

  // Derive a display username unique against profiles.username, with a
  // numeric suffix on collision (e.g. jane.doe, jane.doe-2, jane.doe-3, ...).
  const base = baseUsername(email);
  let username = base;
  for (let suffix = 2; ; suffix++) {
    const { data: taken, error: takenErr } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (takenErr) return withCors({ error: "Could not validate username uniqueness." }, 500);
    if (!taken) break;
    username = `${base}-${suffix}`;
  }

  const temporaryPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: name, role, username },
  });

  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "Could not create the account.";
    const isDup = /already.*registered|already exists/i.test(msg);
    return withCors({ error: isDup ? "An account with that email already exists." : msg }, isDup ? 409 : 500);
  }

  // Defensive: the handle_new_user trigger already inserts full_name/role/
  // username/email and profiles.must_change_password defaults to true, but
  // make the intent explicit and resilient to future default changes.
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ must_change_password: true, status: "active" })
    .eq("id", created.user.id);

  if (updateErr) {
    return withCors({ error: "Account created, but finalizing the profile failed: " + updateErr.message }, 500);
  }

  return withCors({ username, email, temporary_password: temporaryPassword });
});
