// ────────────────────────────────────────────────────────────
// Sync: guardar/leer estado de partida y completions
// ────────────────────────────────────────────────────────────
import { supabase, supabaseEnabled } from './client.js';
import { getUser, ensureSession } from './auth.js';

/**
 * Guarda el estado completo de la partida en curso (JSONB).
 * Con debounce en el caller.
 */
export async function saveProgress(caseId, state) {
  if (!supabaseEnabled) return;
  const user = getUser() || await ensureSession();
  if (!user) return;

  const { error } = await supabase
    .from('case_progress')
    .upsert({
      user_id: user.id,
      case_id: caseId,
      state,
    });
  if (error) console.warn('[Sync] saveProgress falló:', error.message);
}

/** Carga el estado en curso (si existe) para merge con localStorage. */
export async function loadProgress(caseId) {
  if (!supabaseEnabled) return null;
  const user = getUser() || await ensureSession();
  if (!user) return null;

  const { data, error } = await supabase
    .from('case_progress')
    .select('state, updated_at')
    .eq('user_id', user.id)
    .eq('case_id', caseId)
    .maybeSingle();
  if (error) {
    console.warn('[Sync] loadProgress falló:', error.message);
    return null;
  }
  return data; // { state, updated_at } | null
}

/**
 * Registra una partida completada. Devuelve {data, error}.
 * Llamar una vez al finalizar el caso (tras acusación).
 */
export async function recordCompletion({
  caseId,
  score,
  correct,
  accused,
  hintsUsed,
  cluesFound,
  timeTakenSeconds,
  chapterReached = 4,
}) {
  if (!supabaseEnabled) return { error: 'Supabase disabled' };
  const user = getUser() || await ensureSession();
  if (!user) return { error: 'No user' };

  const { data, error } = await supabase
    .from('case_completions')
    .insert({
      user_id: user.id,
      case_id: caseId,
      score,
      correct_accusation: correct,
      accused_suspect: accused,
      hints_used: hintsUsed,
      clues_found: cluesFound,
      time_taken_seconds: timeTakenSeconds,
      chapter_reached: chapterReached,
    })
    .select()
    .single();

  if (error) {
    console.warn('[Sync] recordCompletion falló:', error.message);
    return { error };
  }

  // Actualiza agregados en profile
  await bumpProfileStats({ score, correct, hintsUsed });
  return { data };
}

async function bumpProfileStats({ score, correct, hintsUsed }) {
  const user = getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('total_score, cases_solved, hints_used_lifetime')
    .eq('id', user.id)
    .single();

  if (!profile) return;

  await supabase
    .from('profiles')
    .update({
      total_score: (profile.total_score || 0) + score,
      cases_solved: (profile.cases_solved || 0) + (correct ? 1 : 0),
      hints_used_lifetime: (profile.hints_used_lifetime || 0) + hintsUsed,
    })
    .eq('id', user.id);
}

/** Lee leaderboard público para un caso (solo opt-in). */
export async function fetchLeaderboard(caseId, limit = 100) {
  if (!supabaseEnabled) return [];
  const { data, error } = await supabase
    .from('leaderboard')
    .select('display_name, detective_rank, score, hints_used, time_taken_seconds, completed_at')
    .eq('case_id', caseId)
    .order('score', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[Sync] fetchLeaderboard falló:', error.message);
    return [];
  }
  return data;
}

/** Registra feedback opcional (rating + comment). */
export async function submitFeedback({ caseId, rating, comment }) {
  if (!supabaseEnabled) return { error: 'Supabase disabled' };
  const user = getUser();
  const { error } = await supabase
    .from('case_feedback')
    .insert({
      user_id: user?.id ?? null,
      case_id: caseId,
      rating,
      comment,
    });
  return { error };
}

/**
 * Debounce helper. Uso:
 *   const saveDebounced = debounce((state) => saveProgress('caso-01', state), 1500);
 */
export function debounce(fn, ms = 1200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
