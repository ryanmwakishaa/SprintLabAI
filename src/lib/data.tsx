import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { NutritionLog, PerformanceResult, PeriodisationPhase, Profile, ReadinessLog, WorkoutSession } from './types';
import * as db from './db';
import { defaultPeriodisationPlan, generateWeekSessions } from './periodisation';
import { computeReadiness } from './coach';
import { generateSampleResults } from './sampleData';
import { supabase } from './supabase';

export interface AppData {
  profile: Profile | null;
  readinessLogs: ReadinessLog[];
  sessions: WorkoutSession[];
  results: PerformanceResult[];
  nutrition: NutritionLog[];
  phases: PeriodisationPhase[];
}

interface DataContextValue extends AppData {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveProfile: (p: Partial<Profile>) => Promise<void>;
  saveReadiness: (log: Omit<ReadinessLog, 'id' | 'readiness_score'>) => Promise<void>;
  saveSession: (s: Omit<WorkoutSession, 'id'> & { id?: string }) => Promise<WorkoutSession>;
  deleteSession: (id: string) => Promise<void>;
  saveResult: (r: Omit<PerformanceResult, 'id'> & { id?: string }) => Promise<void>;
  deleteResult: (id: string) => Promise<void>;
  clearSampleData: () => Promise<void>;
  saveNutrition: (n: Omit<NutritionLog, 'id'>) => Promise<void>;
  savePhases: (p: PeriodisationPhase[]) => Promise<void>;
  regenerateWeek: (weekStartDate: Date) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayStr(): string {
  return isoDate(new Date());
}

// Monday of the current week
export function weekStartDate(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({
    profile: null,
    readinessLogs: [],
    sessions: [],
    results: [],
    nutrition: [],
    phases: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [profile, readinessLogs, sessions, results, nutrition, phases] = await Promise.all([
        db.fetchProfile(),
        db.fetchReadinessLogs(),
        db.fetchWorkoutSessions(),
        db.fetchPerformanceResults(),
        db.fetchNutritionLogs(),
        db.fetchPeriodisation(),
      ]);
      setData({ profile, readinessLogs, sessions, results, nutrition, phases });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your data');
      throw e;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      let profile = await db.fetchProfile();
      let phases = await db.fetchPeriodisation();
      let readinessLogs = await db.fetchReadinessLogs();
      const { data: userData } = await supabase.auth.getUser();
      const isNewUser = !profile;

      if (isNewUser) {
        // First sign-in: seed the starter profile and default periodisation plan
        const defaultProfile: Profile = {
          display_name: userData?.user?.email?.split('@')[0] ?? 'Athlete',
          height_cm: 189,
          weight_kg: 79,
          events: '100m, 200m',
          pb_100: 10.70,
          pb_200: 22.00,
          level: 'Competitive sprinter',
          background: 'Strong gym and strength foundation; returning after time away from structured sprint training',
          ambition: 'Develop into an elite-level sprinter and pursue Olympic qualification',
        };
        await db.upsertProfile(defaultProfile);
        phases = defaultPeriodisationPlan(todayStr());
        await db.savePeriodisationPhases(phases);
        // Seed clearly-labelled sample results so analytics have trends
        const samples = generateSampleResults();
        for (const s of samples) {
          await db.savePerformanceResult(s);
        }
        profile = defaultProfile;
        phases = await db.fetchPeriodisation();
        readinessLogs = await db.fetchReadinessLogs();
      }

      // Recover accounts created before the training plan was saved.
      if (phases.length === 0) {
        phases = defaultPeriodisationPlan(todayStr());
        await db.savePeriodisationPhases(phases);
        phases = await db.fetchPeriodisation();
      }

      // Ensure this week's sessions exist (programmed from the current phase + readiness)
      const weekStart = weekStartDate();
      const weekIso = isoDate(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekEndIso = isoDate(weekEnd);

      const existing = await db.fetchWorkoutSessions();
      const hasWeek = existing.some((s) => s.session_date >= weekIso && s.session_date <= weekEndIso);
      if (!hasWeek) {
        const phase = phases.find((p) => p.start_date <= todayStr() && p.end_date >= todayStr())?.phase ?? phases[0].phase;
        const todaysReadiness = readinessLogs.find((r) => r.log_date === todayStr()) ?? null;
        const weekSessions = generateWeekSessions(weekStart, phase, todaysReadiness, existing);
        for (const s of weekSessions) {
          await db.saveWorkoutSession(s);
        }
      }

      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set up your account');
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrapped = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      setError(null);
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
      throw e;
    }
  };

  const value: DataContextValue = {
    ...data,
    loading,
    error,
    refresh,
    saveProfile: (p) => wrapped(async () => {
      await db.upsertProfile(p);
      await refresh();
    }),
    saveReadiness: (log) => wrapped(async () => {
      const withScore = { ...log, readiness_score: computeReadiness(log) };
      await db.upsertReadinessLog(withScore);
      await refresh();
    }),
    saveSession: (s) => wrapped(() => db.saveWorkoutSession(s)),
    deleteSession: (id) => wrapped(async () => {
      await db.deleteWorkoutSession(id);
      await refresh();
    }),
    saveResult: (r) => wrapped(async () => {
      await db.savePerformanceResult(r);
      await refresh();
    }),
    deleteResult: (id) => wrapped(async () => {
      await db.deletePerformanceResult(id);
      await refresh();
    }),
    clearSampleData: () => wrapped(async () => {
      await db.deleteSampleResults();
      await refresh();
    }),
    saveNutrition: (n) => wrapped(async () => {
      await db.upsertNutritionLog(n);
      await refresh();
    }),
    savePhases: (p) => wrapped(async () => {
      await db.savePeriodisationPhases(p);
      await refresh();
    }),
    regenerateWeek: (weekStart) => wrapped(async () => {
      const phase = data.phases.find((p) => p.start_date <= todayStr() && p.end_date >= todayStr())?.phase ?? data.phases[0]?.phase;
      if (!phase) return;
      const readiness = data.readinessLogs.find((r) => r.log_date === todayStr()) ?? null;
      const weekSessions = generateWeekSessions(weekStart, phase, readiness, data.sessions);
      // Delete only sessions in this week that have NOT been started/completed
      const weekIso = isoDate(weekStart);
      const weekEndIso = isoDate(new Date(weekStart.getTime() + 6 * 86400000));
      for (const s of data.sessions) {
        if (s.session_date >= weekIso && s.session_date <= weekEndIso && s.status === 'in_progress' && s.completed_items.length === 0) {
          await db.deleteWorkoutSession(s.id!);
        }
      }
      for (const s of weekSessions) {
        const existing = data.sessions.find((d) => d.session_date === s.session_date);
        if (!existing || (existing.status === 'in_progress' && existing.completed_items.length === 0)) {
          await db.saveWorkoutSession({ ...s, id: existing?.id });
        }
      }
      await refresh();
    }),
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
