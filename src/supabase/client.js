// ────────────────────────────────────────────────────────────
// Supabase client singleton
// ────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_KEY;

if (!url || !key) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_KEY no definidas. ' +
    'Sync y leaderboard deshabilitados. Revisa .env.local.'
  );
}

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'mondragon_auth',
      },
    })
  : null;

export const supabaseEnabled = Boolean(supabase);
