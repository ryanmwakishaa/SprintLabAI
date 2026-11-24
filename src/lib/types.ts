export type Phase =
  | 'Return to Training'
  | 'General Preparation'
  | 'Acceleration Development'
  | 'Max Velocity Development'
  | 'Speed Endurance'
  | 'Competition Preparation'
  | 'Tapering'
  | 'Race Day';

export type Intensity = 'low' | 'moderate' | 'high' | 'max';

export interface Profile {
  display_name: string;
  height_cm: number;
  weight_kg: number;
  events: string;
  pb_100: number;
  pb_200: number;
  level: string;
  background: string;
  ambition: string;
}

export interface ReadinessLog {
  log_date: string;
  sleep_hours: number;
  sleep_quality: number; // 1-5
  soreness: number; // 1-5, higher = more sore
  energy: number; // 1-5
  motivation: number; // 1-5
  fatigue: number; // 1-5, higher = more fatigued
  readiness_score: number;
  notes?: string;
}

export interface ExerciseBlock {
  title: string;
  purpose?: string;
  items: Array<{
    name: string;
    detail: string;
    sets?: number;
    reps?: string;
    recovery?: string;
  }>;
}

export interface PlannedSession {
  blocks: ExerciseBlock[];
  target_times?: string;
  estimated_duration_min: number;
}

export interface WorkoutSession {
  id?: string;
  session_date: string;
  phase: Phase;
  day_type: string;
  title: string;
  objective: string;
  intensity: Intensity;
  planned: PlannedSession;
  completed_items: string[];
  status: 'in_progress' | 'completed' | 'skipped';
  rpe?: number | null;
  duration_min?: number | null;
  coach_notes: string;
  volume_multiplier: number;
  was_overridden: boolean;
}

export type PerformanceMetric =
  | '10m'
  | '20m'
  | '30m'
  | '60m'
  | '100m'
  | '150m'
  | '200m'
  | 'flying_20m'
  | 'squat_1rm'
  | 'trap_bar_1rm'
  | 'nlbh'
  | 'bodyweight';

export const TIMED_METRICS: PerformanceMetric[] = [
  '10m',
  '20m',
  '30m',
  '60m',
  '100m',
  '150m',
  '200m',
  'flying_20m',
];

export const STRENGTH_METRICS: PerformanceMetric[] = ['squat_1rm', 'trap_bar_1rm', 'nlbh'];

export interface PerformanceResult {
  id?: string;
  result_date: string;
  metric: PerformanceMetric;
  value: number;
  timing_method: 'hand' | 'electronic';
  is_sample: boolean;
  notes?: string;
}

export interface NutritionLog {
  log_date: string;
  calories: number;
  protein_g: number;
  hydration_ml: number;
  notes?: string;
}

export interface PeriodisationPhase {
  phase: Phase;
  start_date: string;
  end_date: string;
  notes?: string;
}

export const METRIC_LABELS: Record<PerformanceMetric, string> = {
  '10m': '10m split',
  '20m': '20m split',
  '30m': '30m split',
  '60m': '60m',
  '100m': '100m',
  '150m': '150m',
  '200m': '200m',
  flying_20m: 'Flying 20m',
  squat_1rm: 'Back squat 1RM (kg)',
  trap_bar_1rm: 'Trap bar deadlift 1RM (kg)',
  nlbh: 'Nordic/leg curl NLBH',
  bodyweight: 'Bodyweight (kg)',
};
