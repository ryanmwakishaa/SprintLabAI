import type { ReadinessLog, WorkoutSession, PerformanceResult, PerformanceMetric } from './types';

export interface ReadinessAdjustment {
  status: 'ready' | 'modify' | 'recover';
  headline: string;
  reasons: string[];
  recommended_multiplier: number;
  allow_high_intensity: boolean;
}

export function computeReadiness(log: Omit<ReadinessLog, 'readiness_score' | 'id' | 'log_date'>): number {
  // Each factor 0-100, weighted. Sleep 30%, energy 20%, soreness 15% (inverted), fatigue 15% (inverted), motivation 10%, sleep quality 10%.
  const sleep = Math.min(100, Math.max(0, ((log.sleep_hours - 4) / 5) * 100));
  const sleepQ = ((log.sleep_quality - 1) / 4) * 100;
  const energy = ((log.energy - 1) / 4) * 100;
  const soreness = (1 - (log.soreness - 1) / 4) * 100;
  const fatigue = (1 - (log.fatigue - 1) / 4) * 100;
  const motivation = ((log.motivation - 1) / 4) * 100;

  const score =
    sleep * 0.3 +
    energy * 0.2 +
    soreness * 0.15 +
    fatigue * 0.15 +
    motivation * 0.1 +
    sleepQ * 0.1;

  return Math.round(score);
}

export function assessReadiness(
  log: ReadinessLog,
  recentSessions: WorkoutSession[],
): ReadinessAdjustment {
  const reasons: string[] = [];
  let allowHighIntensity = true;
  let multiplier = 1.0;
  let status: ReadinessAdjustment['status'] = 'ready';

  if (log.readiness_score >= 80) {
    status = 'ready';
    reasons.push('Readiness is high — you can attack today’s session.');
  } else if (log.readiness_score >= 60) {
    status = 'modify';
    multiplier = 0.9;
    reasons.push('Readiness is moderate — keep quality but trim total volume slightly.');
  } else {
    status = 'recover';
    multiplier = 0.6;
    allowHighIntensity = false;
    reasons.push('Readiness is low — today should be a modified or recovery session.');
  }

  if (log.sleep_hours < 6.5) {
    allowHighIntensity = false;
    reasons.push('Under 6.5 hours of sleep: max-velocity and heavy lifting are not recommended today.');
    multiplier = Math.min(multiplier, 0.7);
  }
  if (log.soreness >= 4) {
    reasons.push('High soreness: extended warm-up and mobility work prioritised; reduce external load.');
    multiplier = Math.min(multiplier, 0.8);
  }
  if (log.fatigue >= 4) {
    allowHighIntensity = false;
    reasons.push('High general fatigue: avoid another high CNS demand today.');
  }

  // Consecutive high-intensity days check
  const sorted = [...recentSessions]
    .filter((s) => s.status === 'completed')
    .sort((a, b) => (a.session_date < b.session_date ? 1 : -1));
  const yesterday = sorted[0];
  if (yesterday) {
    const highIntensity = yesterday.intensity === 'high' || yesterday.intensity === 'max';
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    if (highIntensity && yesterday.session_date === oneDayAgo.toISOString().slice(0, 10)) {
      allowHighIntensity = false;
      reasons.push('Yesterday was a high-intensity session — 48h minimum between max CNS efforts.');
    }
  }

  return {
    status,
    headline:
      status === 'ready'
        ? 'Cleared for full training'
        : status === 'modify'
          ? 'Train, but modify'
          : 'Prioritise recovery',
    reasons,
    recommended_multiplier: multiplier,
    allow_high_intensity: allowHighIntensity,
  };
}

export interface ProgressAnalysis {
  improving: boolean;
  plateau: boolean;
  message: string;
  trendPercent: number | null;
}

export function analyseMetricProgress(results: PerformanceResult[], metric: PerformanceMetric): ProgressAnalysis | null {
  const metricResults = results
    .filter((r) => r.metric === metric)
    .sort((a, b) => (a.result_date < b.result_date ? -1 : 1));
  if (metricResults.length < 2) return null;

  const first = metricResults[0];
  const last = metricResults[metricResults.length - 1];
  if (first.result_date === last.result_date) return null;

  const timed = metric === 'bodyweight' || metric === 'squat_1rm' || metric === 'trap_bar_1rm' || metric === 'nlbh' ? metric === 'squat_1rm' || metric === 'trap_bar_1rm' || metric === 'nlbh' : false;
  const isLowerBetter = !timed; // sprint times: lower is better; strength/bodyweight: higher is "more"
  const change = ((last.value - first.value) / first.value) * 100;
  const improving = isLowerBetter ? change < 0 : change > 0;
  const absChange = Math.abs(change);

  if (absChange < 1) {
    return {
      improving: false,
      plateau: true,
      message: `No meaningful change in ${metric} since ${first.result_date} — a plateau. Consider a stimulus change or a deload week.`,
      trendPercent: change,
    };
  }
  return {
    improving,
    plateau: false,
    message: improving
      ? `${metric} trending the right way (${change.toFixed(1)}%) since ${first.result_date}.`
      : `${metric} has moved the wrong way (${change.toFixed(1)}%) since ${first.result_date} — review recovery and nutrition.`,
    trendPercent: change,
  };
}

export function generateCoachNotes(
  assessment: ReadinessAdjustment,
  phase: string,
  dayType: string,
): string {
  const parts: string[] = [];
  parts.push(`Today is a ${dayType.toLowerCase()} day in your ${phase} phase.`);
  if (!assessment.allow_high_intensity && (dayType.includes('Velocity') || dayType.includes('Speed') || dayType.includes('Acceleration'))) {
    parts.push(
      'Normally this session demands high CNS output. Based on your readiness data, I recommend converting the sprint quality work to tempo/volume work or moving this session 24-48h.',
    );
  }
  if (assessment.recommended_multiplier < 1) {
    parts.push(
      `I've reduced the planned volume to ${Math.round(assessment.recommended_multiplier * 100)}% of the standard session.`,
    );
  }
  if (assessment.recommended_multiplier >= 1 && assessment.allow_high_intensity) {
    parts.push('You are clear to work at the full planned volume and intensity.');
  }
  return parts.join(' ');
}

export function proteinTarget(weightKg: number): number {
  // Sprint athletes in a lean-gain phase: ~1.8-2.2 g/kg. Use 2.0 as the daily target.
  return Math.round(weightKg * 2.0);
}

export function calorieTarget(weightKg: number): number {
  // Conservative lean-gain surplus above estimated maintenance.
  return Math.round(weightKg * 44);
}

export function shouldRecommendDeload(recentSessions: WorkoutSession[]): boolean {
  const last7 = recentSessions.filter((s) => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return new Date(s.session_date) >= d;
  });
  const highIntensityCount = last7.filter((s) => s.intensity === 'high' || s.intensity === 'max').length;
  const avgRpe =
    last7.filter((s) => s.rpe).reduce((acc, s) => acc + (s.rpe ?? 0), 0) /
    Math.max(1, last7.filter((s) => s.rpe).length);
  return highIntensityCount >= 5 || avgRpe > 8;
}

export function hydrationTarget(weightKg: number): number {
  return Math.round(weightKg * 35);
}
