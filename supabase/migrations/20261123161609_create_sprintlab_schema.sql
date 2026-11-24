/*
# SprintLab AI — core schema

1. Plain-English summary
This migration creates the tables SprintLab AI needs to store an athlete's profile,
daily readiness checks, workout sessions, performance results, nutrition logs and
their periodisation plan. Every table is scoped to the signed-in athlete so each
user only ever sees their own data.

2. New Tables
- `profiles`: editable athlete profile (height, weight, events, personal bests,
  training background, level, ambition).
- `readiness_logs`: one daily readiness check (sleep, soreness, energy, motivation,
  fatigue) with a computed readiness score. Unique per athlete per day.
- `workout_sessions`: the programmed session for a day (full planned content as
  JSON), its status (in progress / completed / skipped), live progress, RPE,
  duration and the coach's reasoning notes.
- `performance_results`: time trials, split times, gym strength numbers and
  bodyweight entries, with a timing method (hand-timed or electronic) so results
  are never compared across timing systems.
- `nutrition_logs`: daily calories, protein and hydration. Unique per athlete per day.
- `periodisation_phases`: the athlete's phase plan (phase name, start, end, notes).

3. Security
- Row Level Security is ENABLED on every table.
- All policies are scoped `TO authenticated` with an `auth.uid()` ownership check.
- Four separate policies per table (SELECT / INSERT / UPDATE / DELETE).
- Privileges granted only to `authenticated` for the verbs the app uses.

4. Important notes
- All owner columns default to `auth.uid()` so client inserts that omit the
  owner column still satisfy the policies.
- No destructive operations; safe to re-run.
*/

-- ============ profiles ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Athlete',
  height_cm numeric NOT NULL DEFAULT 189,
  weight_kg numeric NOT NULL DEFAULT 79,
  events text NOT NULL DEFAULT '100m, 200m',
  pb_100 numeric NOT NULL DEFAULT 10.70,
  pb_200 numeric NOT NULL DEFAULT 22.00,
  level text NOT NULL DEFAULT 'Competitive sprinter',
  background text NOT NULL DEFAULT 'Strong gym and strength foundation',
  ambition text NOT NULL DEFAULT 'Develop toward elite level and pursue Olympic qualification',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profiles" ON profiles;
CREATE POLICY "select_own_profiles" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profiles" ON profiles;
CREATE POLICY "insert_own_profiles" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profiles" ON profiles;
CREATE POLICY "update_own_profiles" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profiles" ON profiles;
CREATE POLICY "delete_own_profiles" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = id);

-- ============ readiness_logs ============
CREATE TABLE IF NOT EXISTS readiness_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  sleep_hours numeric NOT NULL DEFAULT 7.5,
  sleep_quality integer NOT NULL DEFAULT 3,
  soreness integer NOT NULL DEFAULT 2,
  energy integer NOT NULL DEFAULT 3,
  motivation integer NOT NULL DEFAULT 3,
  fatigue integer NOT NULL DEFAULT 2,
  readiness_score integer NOT NULL DEFAULT 70,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE readiness_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON readiness_logs TO authenticated;

DROP POLICY IF EXISTS "select_own_readiness" ON readiness_logs;
CREATE POLICY "select_own_readiness" ON readiness_logs FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_readiness" ON readiness_logs;
CREATE POLICY "insert_own_readiness" ON readiness_logs FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_readiness" ON readiness_logs;
CREATE POLICY "update_own_readiness" ON readiness_logs FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_readiness" ON readiness_logs;
CREATE POLICY "delete_own_readiness" ON readiness_logs FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============ workout_sessions ============
CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  phase text NOT NULL,
  day_type text NOT NULL,
  title text NOT NULL,
  objective text NOT NULL,
  intensity text NOT NULL DEFAULT 'moderate',
  planned jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'in_progress',
  rpe integer,
  duration_min integer,
  coach_notes text,
  volume_multiplier numeric NOT NULL DEFAULT 1.0,
  was_overridden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON workout_sessions TO authenticated;

DROP POLICY IF EXISTS "select_own_workouts" ON workout_sessions;
CREATE POLICY "select_own_workouts" ON workout_sessions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workouts" ON workout_sessions;
CREATE POLICY "insert_own_workouts" ON workout_sessions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workouts" ON workout_sessions;
CREATE POLICY "update_own_workouts" ON workout_sessions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workouts" ON workout_sessions;
CREATE POLICY "delete_own_workouts" ON workout_sessions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date
ON workout_sessions (user_id, session_date DESC);

-- ============ performance_results ============
CREATE TABLE IF NOT EXISTS performance_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  result_date date NOT NULL,
  metric text NOT NULL,
  value numeric NOT NULL,
  timing_method text NOT NULL DEFAULT 'hand',
  is_sample boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE performance_results ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON performance_results TO authenticated;

DROP POLICY IF EXISTS "select_own_results" ON performance_results;
CREATE POLICY "select_own_results" ON performance_results FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_results" ON performance_results;
CREATE POLICY "insert_own_results" ON performance_results FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_results" ON performance_results;
CREATE POLICY "update_own_results" ON performance_results FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_results" ON performance_results;
CREATE POLICY "delete_own_results" ON performance_results FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_results_user_metric_date
ON performance_results (user_id, metric, result_date DESC);

-- ============ nutrition_logs ============
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein_g integer NOT NULL DEFAULT 0,
  hydration_ml integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON nutrition_logs TO authenticated;

DROP POLICY IF EXISTS "select_own_nutrition" ON nutrition_logs;
CREATE POLICY "select_own_nutrition" ON nutrition_logs FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_nutrition" ON nutrition_logs;
CREATE POLICY "insert_own_nutrition" ON nutrition_logs FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_nutrition" ON nutrition_logs;
CREATE POLICY "update_own_nutrition" ON nutrition_logs FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_nutrition" ON nutrition_logs;
CREATE POLICY "delete_own_nutrition" ON nutrition_logs FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============ periodisation_phases ============
CREATE TABLE IF NOT EXISTS periodisation_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phase text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE periodisation_phases ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON periodisation_phases TO authenticated;

DROP POLICY IF EXISTS "select_own_phases" ON periodisation_phases;
CREATE POLICY "select_own_phases" ON periodisation_phases FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_phases" ON periodisation_phases;
CREATE POLICY "insert_own_phases" ON periodisation_phases FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_phases" ON periodisation_phases;
CREATE POLICY "update_own_phases" ON periodisation_phases FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_phases" ON periodisation_phases;
CREATE POLICY "delete_own_phases" ON periodisation_phases FOR DELETE
TO authenticated USING (auth.uid() = user_id);