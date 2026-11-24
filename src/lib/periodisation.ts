import type { PeriodisationPhase, Phase, WorkoutSession } from './types';
import { SESSION_TEMPLATES } from './sessionTemplates';
import { assessReadiness, computeReadiness, generateCoachNotes } from './coach';
import type { ReadinessLog } from './types';

export const PHASE_ORDER: Phase[] = [
  'Return to Training',
  'General Preparation',
  'Acceleration Development',
  'Max Velocity Development',
  'Speed Endurance',
  'Competition Preparation',
  'Tapering',
  'Race Day',
];

export const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  'Return to Training': 'Re-establish training consistency, rebuild tissue tolerance and re-groove sprint mechanics after time away.',
  'General Preparation': 'Build general strength, work capacity and mobility as the foundation for more specific sprint work.',
  'Acceleration Development': 'Prioritise 0-30m acceleration: drive-phase mechanics, horizontal power and starting ability.',
  'Max Velocity Development': 'Shift emphasis to top-end speed with high-quality, fully recovered maximal sprinting.',
  'Speed Endurance': 'Develop the ability to hold near-maximal velocity under fatigue — critical for 100m quality.',
  'Competition Preparation': 'Race modelling, special endurance and sharpening while maintaining speed and strength.',
  Tapering: 'Reduce volume, maintain intensity. Arrive fresh, fast and emotionally sharp.',
  'Race Day': 'Minimal volume, maximal readiness. Warm-up, short accelerations, execute.',
};

// Weekly microcycle pattern per phase, keyed by day of week (Monday=0)
const WEEK_PATTERNS: Record<string, Array<string | null>> = {
  'Return to Training': [
    'acceleration', 'mobility', 'tempo', 'strength', 'mobility', 'acceleration', null,
  ],
  'General Preparation': [
    'acceleration', 'mobility', 'tempo', 'strength', 'mobility', 'maxvelocity', null,
  ],
  'Acceleration Development': [
    'acceleration', 'mobility', 'tempo', 'strength', 'mobility', 'maxvelocity', null,
  ],
  'Max Velocity Development': [
    'maxvelocity', 'mobility', 'tempo', 'strength', 'mobility', 'speedendurance', null,
  ],
  'Speed Endurance': [
    'maxvelocity', 'mobility', 'speedendurance', 'strength', 'mobility', 'specialendurance', null,
  ],
  'Competition Preparation': [
    'maxvelocity', 'mobility', 'specialendurance', 'strength', 'mobility', 'speedendurance', null,
  ],
  'Tapering': [
    'maxvelocity', 'mobility', 'acceleration', 'mobility', 'tempo', null, null,
  ],
  'Race Day': [
    'maxvelocity', 'mobility', 'acceleration', null, null, 'specialendurance', null,
  ],
};

export function currentPhase(plan: PeriodisationPhase[], onDate: string): Phase | null {
  const active = plan
    .filter((p) => p.start_date <= onDate && p.end_date >= onDate)
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  return active[0]?.phase ?? null;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function generateWeekSessions(
  weekStart: Date,
  phase: Phase,
  readinessLog: ReadinessLog | null,
  recentSessions: WorkoutSession[],
): WorkoutSession[] {
  const pattern = WEEK_PATTERNS[phase] ?? WEEK_PATTERNS['General Preparation'];
  const assessment = readinessLog
    ? assessReadiness({ ...readinessLog, readiness_score: computeReadiness(readinessLog) }, recentSessions)
    : null;
  const multiplier = assessment?.recommended_multiplier ?? 1.0;

  return pattern.map((key, idx) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + idx);
    if (!key) {
      return {
        session_date: isoDate(date),
        phase,
        day_type: 'Rest Day',
        title: 'Rest & Recovery',
        objective: 'Complete rest or a light walk. Sleep and nutrition are the priority today.',
        intensity: 'low' as const,
        planned: {
          blocks: [
            {
              title: 'Rest Day Guidance',
              purpose: 'Full rest — the adaptation from your training happens on days like this.',
              items: [
                { name: 'Light walk (optional)', detail: '10-20 minutes, easy, outside if possible', sets: 1, reps: '15 min' },
                { name: 'Hydration & protein focus', detail: 'Hit your daily protein and hydration targets', sets: 1, reps: 'All day' },
                { name: 'Sleep priority', detail: 'Aim for 8+ hours tonight — this is when adaptation happens', sets: 1, reps: '8+ hours' },
              ],
            },
          ],
          estimated_duration_min: 15,
        },
        completed_items: [],
        status: 'in_progress' as const,
        coach_notes: 'Complete rest supports the high-intensity work later in the week. No optional extra training today.',
        volume_multiplier: 1,
        was_overridden: false,
      };
    }

    const template = SESSION_TEMPLATES[key];
    const planned = template.build(phase, multiplier);
    const session: WorkoutSession = {
      session_date: isoDate(date),
      phase,
      day_type: template.dayType,
      title: template.title,
      objective: template.objective,
      intensity: template.intensity,
      planned,
      completed_items: [],
      status: 'in_progress',
      coach_notes: '',
      volume_multiplier: multiplier,
      was_overridden: false,
    };
    session.coach_notes = assessment
      ? generateCoachNotes(assessment, phase, template.dayType)
      : `Today is a ${template.dayType.toLowerCase()} day in your ${phase} phase. You are clear to work at the full planned volume and intensity.`;
    return session;
  });
}

export function defaultPeriodisationPlan(startDate: string): PeriodisationPhase[] {
  const start = new Date(startDate + 'T00:00:00');
  const phases: Array<{ phase: Phase; weeks: number }> = [
    { phase: 'Return to Training', weeks: 3 },
    { phase: 'General Preparation', weeks: 3 },
    { phase: 'Acceleration Development', weeks: 4 },
    { phase: 'Max Velocity Development', weeks: 4 },
    { phase: 'Speed Endurance', weeks: 3 },
    { phase: 'Competition Preparation', weeks: 4 },
    { phase: 'Tapering', weeks: 1 },
    { phase: 'Race Day', weeks: 1 },
  ];
  let cursor = new Date(start);
  return phases.map(({ phase, weeks }) => {
    const s = new Date(cursor);
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + weeks * 7);
    const e = new Date(cursor);
    e.setDate(e.getDate() - 1);
    return {
      phase,
      start_date: isoDate(s),
      end_date: isoDate(e),
      notes: PHASE_DESCRIPTIONS[phase],
    };
  });
}
