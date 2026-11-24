import { supabase } from './supabase';
import type {
  NutritionLog,
  PerformanceResult,
  PeriodisationPhase,
  Profile,
  ReadinessLog,
  WorkoutSession,
} from './types';

async function getuserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

// ---------- profile ----------
export async function fetchProfile(): Promise<Profile | null> {
  const userId = await getuserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertProfile(profile: Partial<Profile>): Promise<void> {
  const userId = await getuserId();
  const { error } = await supabase
    .from('profiles')
    .upsert({ ...profile, id: userId });
  if (error) throw error;
}

// ---------- readiness ----------
export async function fetchReadinessLogs(): Promise<ReadinessLog[]> {
  const userId = await getuserId();
  const { data, error } = await supabase
    .from('readiness_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(60);
  if (error) throw error;
  return data ?? [];
}

export async function upsertReadinessLog(log: Omit<ReadinessLog, 'id'>): Promise<void> {
  const userId = await getuserId();
  const { error } = await supabase
    .from('readiness_logs')
    .upsert(
      { ...log, user_id: userId },
      { onConflict: 'user_id,log_date' },
    );
  if (error) throw error;
}

// ---------- workouts ----------
export async function fetchWorkoutSessions(): Promise<WorkoutSession[]> {
  const userId = await getuserId();
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(120);
  if (error) throw error;
  return data ?? [];
}

export async function fetchWorkoutByDate(date: string): Promise<WorkoutSession | null> {
  const userId = await getuserId();
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_date', date)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveWorkoutSession(
  session: Omit<WorkoutSession, 'id'> & { id?: string },
): Promise<WorkoutSession> {
  const userId = await getuserId();
  const query = session.id
    ? supabase
        .from('workout_sessions')
        .upsert({ ...session, user_id: userId }, { onConflict: 'id' })
    : supabase
        .from('workout_sessions')
        .insert({ ...session, user_id: userId });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
  if (error) throw error;
}

// ---------- performance ----------
export async function fetchPerformanceResults(): Promise<PerformanceResult[]> {
  const userId = await getuserId();
  const { data, error } = await supabase
    .from('performance_results')
    .select('*')
    .eq('user_id', userId)
    .order('result_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function savePerformanceResult(
  result: Omit<PerformanceResult, 'id'> & { id?: string },
): Promise<void> {
  const userId = await getuserId();
  const { error } = await supabase
    .from('performance_results')
    .insert({ ...result, user_id: userId });
  if (error) throw error;
}

export async function deletePerformanceResult(id: string): Promise<void> {
  const { error } = await supabase.from('performance_results').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteSampleResults(): Promise<void> {
  const userId = await getuserId();
  const { error } = await supabase
    .from('performance_results')
    .delete()
    .eq('user_id', userId)
    .eq('is_sample', true);
  if (error) throw error;
}

// ---------- nutrition ----------
export async function fetchNutritionLogs(): Promise<NutritionLog[]> {
  const userId = await getuserId();
  const { data, error } = await supabase
    .from('nutrition_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(90);
  if (error) throw error;
  return data ?? [];
}

export async function upsertNutritionLog(log: Omit<NutritionLog, 'id'>): Promise<void> {
  const userId = await getuserId();
  const { error } = await supabase
    .from('nutrition_logs')
    .upsert({ ...log, user_id: userId }, { onConflict: 'user_id,log_date' });
  if (error) throw error;
}

// ---------- periodisation ----------
export async function fetchPeriodisation(): Promise<PeriodisationPhase[]> {
  const userId = await getuserId();
  const { data, error } = await supabase
    .from('periodisation_phases')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function savePeriodisationPhases(phases: PeriodisationPhase[]): Promise<void> {
  const userId = await getuserId();
  // Replace plan atomically per save — phase plans are fully re-planned on edit.
  const del = await supabase.from('periodisation_phases').delete().eq('user_id', userId);
  if (del.error) throw del.error;
  if (phases.length === 0) return;
  const { error } = await supabase
    .from('periodisation_phases')
    .insert(phases.map((p) => ({ ...p, user_id: userId })));
  if (error) throw error;
}

// ---------- export ----------
export async function exportAllData(): Promise<string> {
  const [profile, readiness, workouts, results, nutrition, phases] = await Promise.all([
    fetchProfile(),
    fetchReadinessLogs(),
    fetchWorkoutSessions(),
    fetchPerformanceResults(),
    fetchNutritionLogs(),
    fetchPeriodisation(),
  ]);
  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      app: 'SprintLab AI',
      profile,
      readiness_logs: readiness,
      workout_sessions: workouts,
      performance_results: results,
      nutrition_logs: nutrition,
      periodisation_phases: phases,
    },
    null,
    2,
  );
}
