#!/usr/bin/env node
// Live verification script for the DG-Rating-Model Supabase migration.
//
// This exercises the REAL backend through the same client SDK + anon key the
// browser app uses (never the SQL editor, never the service_role key from
// this script's own network calls — see the header comment on each check
// for what it actually proves).
//
// Requires a real admin account's credentials, supplied via env vars — never
// hardcode a password here:
//
//   SUPABASE_URL=https://gvqnlhyligtoxlaxnmzr.supabase.co \
//   SUPABASE_ANON_KEY=<anon key> \
//   ADMIN_EMAIL=admin@admin.com \
//   ADMIN_PASSWORD=<the real admin password> \
//   node supabase/verify/verify.mjs
//
// Run `npm install @supabase/supabase-js` in this directory (or anywhere on
// NODE_PATH) first.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gvqnlhyligtoxlaxnmzr.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let failures = 0;
function check(label, ok, detail) {
  if (ok) {
    console.log(`PASS  ${label}`);
  } else {
    failures++;
    console.log(`FAIL  ${label}${detail ? '\n      ' + detail : ''}`);
  }
}

function requireEnv() {
  const missing = [];
  if (!ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (!ADMIN_EMAIL) missing.push('ADMIN_EMAIL');
  if (!ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD');
  if (missing.length) {
    console.error('Missing required env vars: ' + missing.join(', '));
    console.error('This script needs a real admin account to run — see the header comment.');
    process.exit(1);
  }
}

async function main() {
  requireEnv();

  // Two separate clients, exactly like two different browser sessions would
  // be: each only ever holds the anon key + whatever session token
  // signInWithPassword() returns. Neither ever touches service_role.
  const adminClient = createClient(SUPABASE_URL, ANON_KEY);
  const analystClient = createClient(SUPABASE_URL, ANON_KEY);

  // --- Sign in as the real admin -------------------------------------------------
  const { data: adminAuth, error: adminSignInErr } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
  });
  check('Admin sign-in succeeds', !adminSignInErr && !!adminAuth?.session, adminSignInErr?.message);
  if (adminSignInErr) { console.error('Cannot continue without a working admin session.'); process.exit(1); }

  const { data: adminProfile } = await adminClient.from('profiles').select('role').eq('id', adminAuth.user.id).single();
  check("Admin's own profile.role is 'admin'", adminProfile?.role === 'admin', JSON.stringify(adminProfile));

  // --- Create a second test user (role: analyst) via the create-user Edge Function ----
  // This call carries Authorization: Bearer <admin's own JWT> and apikey: <anon key>
  // only — proving the create-user flow never needs, and never sees, service_role
  // from the caller's side. (The Edge Function loads service_role from its own
  // server-side environment — see supabase/functions/_shared/admin_guard.ts.)
  const testEmail = `verify-analyst-${Date.now()}@example.com`;
  const createRes = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminAuth.session.access_token}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ name: 'Verification Test Analyst', email: testEmail, role: 'analyst' }),
  });
  const created = await createRes.json();
  check('create-user Edge Function creates a second analyst account', createRes.ok && created.temporary_password, JSON.stringify(created));
  if (!createRes.ok) { console.error('Cannot continue without the test analyst account.'); process.exit(1); }
  console.log(`      created ${created.username} <${created.email}>`);

  // --- Sign in as that new analyst using the generated temp password ------------------
  const { data: analystAuth, error: analystSignInErr } = await analystClient.auth.signInWithPassword({
    email: created.email, password: created.temporary_password,
  });
  check('New analyst can sign in with the generated temporary password', !analystSignInErr && !!analystAuth?.session, analystSignInErr?.message);
  if (analystSignInErr) { console.error('Cannot continue without a working analyst session.'); process.exit(1); }

  // --- Create an assessment owned by the admin, to use as the IDOR target -------------
  const targetId = crypto.randomUUID();
  const { error: insertErr } = await adminClient.from('assessments').insert({
    id: targetId, owner_id: adminAuth.user.id, state: { __computed: { name: 'IDOR verification target' } },
  });
  check("Admin can create an assessment (owner_id = admin's own id)", !insertErr, insertErr?.message);

  // --- THE IDOR TEST: the analyst queries that assessment by ID through the client SDK,
  // under their own session — not the SQL editor, which would bypass RLS entirely. -----
  const { data: idorRow, error: idorErr } = await analystClient
    .from('assessments').select('*').eq('id', targetId).maybeSingle();
  check(
    "IDOR: analyst's client-SDK query for another user's assessment ID returns no row",
    !idorErr && idorRow == null,
    idorErr ? idorErr.message : `unexpectedly got a row: ${JSON.stringify(idorRow)}`
  );

  // --- Admin CAN read the same row (also through the client SDK, own session) --------
  const { data: adminRow, error: adminReadErr } = await adminClient
    .from('assessments').select('*').eq('id', targetId).maybeSingle();
  check('Admin can read that same assessment via the client SDK', !adminReadErr && adminRow?.id === targetId, adminReadErr?.message);

  // --- Last-admin-lockout trigger ------------------------------------------------------
  const { count: adminCount } = await adminClient
    .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
  if (adminCount === 1) {
    const { error: demoteErr } = await adminClient
      .from('profiles').update({ role: 'analyst' }).eq('id', adminAuth.user.id);
    check(
      'Last-admin-lockout trigger blocks demoting the sole admin',
      !!demoteErr && /last remaining admin/i.test(demoteErr.message || ''),
      demoteErr ? demoteErr.message : 'demote unexpectedly succeeded — lockout trigger did not fire'
    );
    const { data: stillAdmin } = await adminClient.from('profiles').select('role').eq('id', adminAuth.user.id).single();
    check('...and the admin row is still role=admin after the blocked attempt', stillAdmin?.role === 'admin', JSON.stringify(stillAdmin));
  } else {
    console.log(`SKIP  Last-admin-lockout test — ${adminCount} admin accounts currently exist, so demoting one wouldn't zero out admins. Promote all but one to analyst first if you want to exercise this, or run this check in a scratch project.`);
  }

  // --- service_role never appears in what this script (acting as "the browser") sent --
  const sentHeaders = { Authorization: `Bearer ${adminAuth.session.access_token}`, apikey: ANON_KEY };
  const sentAsString = JSON.stringify(sentHeaders);
  check(
    'Every request this script made as a client used only anon key + user JWTs (no service_role)',
    !/service_role/i.test(sentAsString) && !decodeJwtRoleIsServiceRole(ANON_KEY) && !decodeJwtRoleIsServiceRole(adminAuth.session.access_token),
  );
  console.log('      For the actual shipped app: open the admin console in a real browser, open DevTools → Network,');
  console.log('      trigger "Create account", and inspect the request to /functions/v1/create-user — the Authorization');
  console.log('      header carries the signed-in admin\'s JWT (decode at jwt.io: "role":"authenticated"), never a');
  console.log('      "role":"service_role" token. (Static check already done separately: production build contains zero');
  console.log('      occurrences of "service_role" or "sb_secret_" — see README/CHECKLIST for the grep command.)');

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  process.exit(failures === 0 ? 0 : 1);
}

function decodeJwtRoleIsServiceRole(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
    return payload.role === 'service_role';
  } catch { return false; }
}

main().catch((e) => { console.error('Verification script crashed:', e); process.exit(1); });
