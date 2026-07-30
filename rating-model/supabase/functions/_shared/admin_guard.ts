import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// Two clients: `admin` uses the service_role key (server-side only, never sent
// to the browser) for privileged writes; `asCaller` is used solely to verify
// the bearer JWT and look up who's calling.
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function requireAdmin(
  req: Request,
): Promise<{ ok: true; userId: string; admin: SupabaseClient } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return { ok: false, status: 401, error: "Missing bearer token." };

  const admin = serviceClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return { ok: false, status: 401, error: "Invalid or expired session." };
  }

  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileErr || !profile || profile.role !== "admin") {
    return { ok: false, status: 403, error: "Admin privileges required." };
  }

  return { ok: true, userId: userData.user.id, admin };
}
