// ────────────────────────────────────────────────────────────
// Auth: arranca anónimo automáticamente; permite promover a email
// ────────────────────────────────────────────────────────────
import { supabase, supabaseEnabled } from './client.js';

let currentUser = null;
const listeners = new Set();

/** Asegura que hay una sesión (crea anónima si no existe). */
export async function ensureSession() {
  if (!supabaseEnabled) return null;

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    return currentUser;
  }

  // No hay sesión → crear anónima
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[Auth] Anonymous sign-in falló:', error.message);
    return null;
  }
  currentUser = data.user;
  return currentUser;
}

export function getUser() {
  return currentUser;
}

/** Suscribirse a cambios de sesión. Retorna función de cleanup. */
export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (supabaseEnabled) {
  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    listeners.forEach(fn => fn(currentUser));
  });
}

/**
 * Promueve una cuenta anónima a cuenta con email (magic link).
 * Mantiene todo el progreso porque conserva el mismo user_id.
 */
export async function promoteToEmail(email) {
  if (!supabaseEnabled || !currentUser) return { error: 'No session' };
  const { data, error } = await supabase.auth.updateUser({ email });
  return { data, error };
}

/** Actualiza el display_name en el profile. */
export async function updateDisplayName(name) {
  if (!supabaseEnabled || !currentUser) return { error: 'No session' };
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name })
    .eq('id', currentUser.id);
  return { error };
}

/** Toggle opt-in al leaderboard público. */
export async function setLeaderboardOptIn(optIn) {
  if (!supabaseEnabled || !currentUser) return { error: 'No session' };
  const { error } = await supabase
    .from('profiles')
    .update({ opt_in_leaderboard: optIn })
    .eq('id', currentUser.id);
  return { error };
}

/** Lee el profile del usuario actual. */
export async function getProfile() {
  if (!supabaseEnabled || !currentUser) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  return data;
}
