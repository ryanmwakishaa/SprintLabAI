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
    'acceleration', 'mobility', 'tempo', 'strength', 'mobility', null, null,
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
    // A check-in describes today's condition, not the athlete's condition for
    // every future day in the week.
    const dayAssessment = readinessLog && isoDate(date) === readinessLog.log_date ? assessment : null;
    const multiplier = dayAssessment?.recommended_multiplier ?? (phase === 'Return to Training' ? 0.65 : 1);
    let planned = template.build(phase, 1);
    let intensity = template.intensity;
    let title = template.title;
    let objective = template.objective;
    let dayType = template.dayType;
    let coachNotes = dayAssessment
      ? generateCoachNotes(dayAssessment, phase, template.dayType)
      : 'Provisional session. Complete today’s readiness check before training and re-plan if recovery is below normal.';

    if (dayAssessment && !dayAssessment.allow_high_intensity && ['high', 'max'].includes(template.intensity)) {
      // Do not merely warn about high intensity: remove the sprint/plyometric
      // work from today's session and replace it with low-stress recovery.
      planned = {
        blocks: [{
          title: 'Readiness-adjusted recovery',
          purpose: 'Protect recovery today. Resume high-quality sprinting when readiness and spacing between hard sessions allow it.',
          items: [
            { name: 'Easy walk or bike', detail: '10-15 minutes at conversational effort. Stop if symptoms worsen.', sets: 1, reps: '10-15 min' },
            { name: 'Gentle mobility', detail: 'Pain-free hip, ankle and thoracic mobility. No aggressive stretching.', sets: 1, reps: '8-10 min' },
            { name: 'Breathing reset', detail: 'Slow nasal breathing and relaxed exhalations.', sets: 1, reps: '3-5 min' },
          ],
        }],
        estimated_duration_min: 25,
      };
      intensity = 'low';
      title = 'Recovery Session — Sprint Work Modified';
      objective = 'Today’s high-intensity work has been replaced because your readiness check does not support maximal sprinting.';
      dayType = 'Recovery / Modified';
      coachNotes += ' The original high-intensity sprint and plyometric blocks have been removed, not just reduced.';
    } else if (multiplier < 1) {
      // Apply the reduction to work sets. Warm-ups, mobility and cooldowns stay intact.
      planned = {
        ...planned,
        estimated_duration_min: Math.round(planned.estimated_duration_min * (0.7 + 0.3 * multiplier)),
        blocks: planned.blocks.map((block) => {
          const isPreparation = /warm-up|mobility|cooldown/i.test(block.title);
          if (isPreparation) return block;
          return {
            ...block,
            items: block.items.map((item) => ({
              ...item,
              sets: item.sets ? Math.max(1, Math.floor(item.sets * multiplier)) : item.sets,
            })),
          };
        }),
      };
    }

    // Return-to-training is deliberately conservative: avoid stacking a second
    // acceleration day and remove depth jumps/bounding from the early rebuild.
    if (phase === 'Return to Training' && !dayAssessment?.allow_high_intensity) {
      planned = {
        ...planned,
        blocks: planned.blocks.map((block) => ({
          ...block,
          items: block.items.filter((item) => !/depth jump|bounding|pogo|sled|150m|120m|200m race/i.test(item.name)),
        })).filter((block) => block.items.length > 0),
      };
    }

    return {
      session_date: isoDate(date),
      phase,
      day_type: dayType,
      title,
      objective,
      intensity,
      planned,
      completed_items: [],
      status: 'in_progress',
      coach_notes: coachNotes,
      volume_multiplier: multiplier,
      was_overridden: false,
    };
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
