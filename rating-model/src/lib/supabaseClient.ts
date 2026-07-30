import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Throwing here would crash the whole module graph before React ever
// mounts, producing a blank page with nothing but a console error. Instead,
// export the problem as a value — main.tsx checks it and renders a real
// on-page message before attempting to render the app.
export const supabaseConfigError = (!url || !anonKey)
  ? 'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in your deployment platform\'s environment variables (in Vercel: Project Settings → Environment Variables), or copy .env.example to .env.local for local dev.'
  : null;

export const supabase = createClient<Database>(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
);
