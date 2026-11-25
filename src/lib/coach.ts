import { TIMED_METRICS, STRENGTH_METRICS, type ReadinessLog, type WorkoutSession, type PerformanceResult, type PerformanceMetric } from './types';

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
    allowHighIntensity = false;
    reasons.push('High soreness: remove maximal sprinting and heavy explosive work today; use pain-free recovery work.');
    multiplier = Math.min(multiplier, 0.7);
  }
  if (log.fatigue >= 4) {
    allowHighIntensity = false;
    reasons.push('High general fatigue: avoid another high CNS demand today.');
  }

  // Keep at least 48 hours between completed high-intensity sessions.
  // Use the check-in date, not the device clock, so historical/replanned sessions
  // are assessed deterministically.
  const checkInDate = new Date(`${log.log_date}T00:00:00Z`);
  const recentHighSessions = recentSessions.filter((session) => {
    if (session.status !== 'completed' || !['high', 'max'].includes(session.intensity)) return false;
    const sessionDate = new Date(`${session.session_date}T00:00:00Z`);
    const hoursSince = (checkInDate.getTime() - sessionDate.getTime()) / 3600000;
    return hoursSince >= 0 && hoursSince < 48;
  });
  if (recentHighSessions.length > 0) {
    allowHighIntensity = false;
    multiplier = Math.min(multiplier, 0.7);
    reasons.push('A high-intensity session was completed within the last 48 hours. Replace today’s speed work with recovery or low-intensity work.');
  }

  if (!allowHighIntensity && status === 'ready') status = 'modify';
  if (recentHighSessions.length > 0 || log.readiness_score < 60 || log.fatigue >= 4) status = 'recover';

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
  // Demo values must never influence an athlete's coaching feedback.
  const metricResults = results
    .filter((r) => r.metric === metric && !r.is_sample)
    .sort((a, b) => (a.result_date < b.result_date ? -1 : 1));
  if (metricResults.length < 2) return null;

  // Hand and electronic sprint times are not directly comparable. Analyse the
  // timing method with the most observations rather than mixing both systems.
  const timed = TIMED_METRICS.includes(metric);
  const electronicCount = metricResults.filter((r) => r.timing_method === 'electronic').length;
  const handCount = metricResults.filter((r) => r.timing_method === 'hand').length;
  const selectedTiming = timed
    ? (electronicCount >= handCount ? 'electronic' : 'hand')
    : null;
  const comparable = selectedTiming
    ? metricResults.filter((r) => r.timing_method === selectedTiming)
    : metricResults;
  if (comparable.length < 2) return null;

  const first = comparable[0];
  const last = comparable[comparable.length - 1];
  if (first.result_date === last.result_date) return null;

  const change = ((last.value - first.value) / first.value) * 100;
  const absChange = Math.abs(change);
  const isBodyweight = metric === 'bodyweight';
  const improving = timed ? change < 0 : STRENGTH_METRICS.includes(metric) ? change > 0 : false;

  if (absChange < 1) {
    return {
      improving: false,
      plateau: true,
      message: isBodyweight
        ? `Bodyweight has remained stable since ${first.result_date}.`
        : `No meaningful change in ${metric} since ${first.result_date} — a plateau. Review the training stimulus and recovery before changing the programme.`,
      trendPercent: change,
    };
  }

  const timingLabel = timed ? ` (${selectedTiming}-timed)` : '';
  const message = isBodyweight
    ? `Bodyweight changed ${change > 0 ? 'up' : 'down'} ${absChange.toFixed(1)}% since ${first.result_date}; interpret this alongside strength, nutrition and the athlete’s goal.`
    : `${metric}${timingLabel} ${improving ? 'is trending the right way' : 'has moved in the wrong direction'} (${change.toFixed(1)}%) since ${first.result_date}.`;

  return { improving, plateau: false, message, trendPercent: change };
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
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const last7 = recentSessions.filter((s) =>
    s.status === 'completed' && new Date(`${s.session_date}T00:00:00`) >= cutoff
  );
  const highIntensityCount = last7.filter((s) => s.intensity === 'high' || s.intensity === 'max').length;
  const avgRpe =
    last7.filter((s) => s.rpe).reduce((acc, s) => acc + (s.rpe ?? 0), 0) /
    Math.max(1, last7.filter((s) => s.rpe).length);
  return highIntensityCount >= 5 || avgRpe > 8;
}

export function hydrationTarget(weightKg: number): number {
  return Math.round(weightKg * 35);
}
