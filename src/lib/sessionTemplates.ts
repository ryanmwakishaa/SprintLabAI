import type { ExerciseBlock, Intensity, Phase, PlannedSession } from './types';

export interface SessionTemplate {
  dayType: string;
  title: string;
  objective: string;
  intensity: Intensity;
  build: (phase: Phase, volumeMultiplier: number) => PlannedSession;
}

function warmupBlock(focus: string, extended = false): ExerciseBlock {
  return {
    title: 'Warm-Up Routine',
    purpose: 'Raise core temperature and progressively prime the nervous system',
    items: [
      { name: 'Easy jog / skip', detail: `${extended ? '8' : '5'} minutes, easy effort, nose-breathing pace`, sets: 1, reps: extended ? '8 min' : '5 min' },
      { name: 'Leg swings (front-back, side-side)', detail: 'Controlled, full range, no forcing', sets: 2, reps: '10 each side' },
      { name: 'Walking lunges with overhead reach', detail: 'Long stride, tall posture, reach up at the bottom', sets: 1, reps: '8 each leg' },
      { name: 'A-skips', detail: 'Emphasise piston-like ankle action and tall hip', sets: 3, reps: '20m' },
      { name: 'B-skips', detail: 'Active claw-back, stay tall, do not over-reach', sets: 3, reps: '20m' },
      ...(extended
        ? [{ name: 'Graduated strides', detail: 'Build to 80-90-95% over three strides', sets: 3, reps: '60m', recovery: '90s walk-back' }]
        : [{ name: 'Strides', detail: 'Smooth acceleration to ~85%, stay relaxed', sets: 3, reps: '60m', recovery: '60s walk-back' }]),
    ],
    ...(focus ? {} : {}),
  };
}

function mobilityBlock(extended = false): ExerciseBlock {
  return {
    title: 'Dynamic Mobility',
    purpose: 'Open hips, ankles and thoracic spine for sprint-specific range',
    items: [
      { name: 'World’s greatest stretch', detail: 'Move slowly, exhale into rotation', sets: 1, reps: '5 each side' },
      { name: 'Ankle rock (wall drill)', detail: 'Knee tracks over toe, heel stays down', sets: 2, reps: '10 each side' },
      { name: '90/90 hip transitions', detail: 'Keep torso tall, no collapsing', sets: 2, reps: '8 each side' },
      { name: 'Couch stretch / hip flexor rock', detail: 'Squeeze glute of the stretched leg, 60-90s each side', sets: 1, reps: extended ? '90s each side' : '60s each side' },
      ...(extended ? [{ name: 'Thoracic openers', detail: 'Side-lying windmills, follow hand with eyes', sets: 1, reps: '8 each side' }] : []),
    ],
  };
}

function sprintDrillBlock(): ExerciseBlock {
  return {
    title: 'Sprint Drills',
    purpose: 'Groove mechanics specific to today’s speed quality',
    items: [
      { name: 'High-knee wall drill', detail: '3 holds of 5s each side — feel vertical shin and braced torso', sets: 3, reps: '5s hold each side' },
      { name: 'Straight-leg bound (dribble)', detail: 'Fast ground contact, pawing action under hips', sets: 3, reps: '20m' },
      { name: 'Ankle dribbles', detail: 'Stiff ankle, minimal knee lift, rapid contacts', sets: 2, reps: '15m' },
    ],
  };
}

function cooldownBlock(): ExerciseBlock {
  return {
    title: 'Cooldown & Recovery',
    purpose: 'Shift out of high CNS state, begin recovery process',
    items: [
      { name: 'Easy walk / jog', detail: '5 minutes, let heart rate settle gradually', sets: 1, reps: '5 min' },
      { name: 'Static hamstring stretch', detail: '30s each side, breathe out into the stretch', sets: 2, reps: '30s each side' },
      { name: 'Calf stretch against wall', detail: 'Straight-knee and bent-knee versions, 30s each', sets: 2, reps: '30s each' },
      { name: 'Glute/hip figure-4 stretch', detail: '30s each side, do not bounce', sets: 2, reps: '30s each side' },
      { name: 'Soft tissue (foam roll / ball)', detail: 'Quads, hamstrings, glutes, calves — 1-2 min per area', sets: 1, reps: '8 min' },
    ],
  };
}

function accelMain(phase: Phase, mult: number): ExerciseBlock {
  const reps = Math.max(2, Math.round(5 * mult));
  return {
    title: 'Main Session — Acceleration Development',
    purpose: 'Build the ability to reach high horizontal force rapidly. Short, maximal efforts with full recovery.',
    items: [
      { name: 'Block or 2-point start 10m sprints', detail: 'Maximal intent from first step. Drive low, aggressive punch of the ground, chase full extension', sets: reps, reps: '10m', recovery: '2-3 min full recovery' },
      { name: '20m acceleration from 3-point stance', detail: 'Explode from the front, gradual rise over first 15m, don’t stand up too early', sets: Math.max(2, Math.round(3 * mult)), reps: '20m', recovery: '3 min' },
      { name: 'Push-up start / med-ball starts', detail: 'Emphasises the drive angle and first-step power', sets: 2, reps: '10m', recovery: '2 min' },
      { name: 'Sled push or hill sprint 15m', detail: 'Load light enough that posture stays sprint-like (~10-15% bodyweight sled). Walk-back recovery', sets: Math.max(2, Math.round(4 * mult)), reps: '15m', recovery: '2 min' },
    ],
  };
}

function maxVMain(phase: Phase, mult: number): ExerciseBlock {
  const reps = Math.max(2, Math.round(4 * mult));
  return {
    title: 'Main Session — Maximum Velocity',
    purpose: 'Expose the body to top-end speed. Low volume, maximal intensity, full recovery — quality over quantity.',
    items: [
      { name: 'Build-up runs', detail: 'Gradual acceleration to ~95% over 40m, then float. Rehearse relaxation at speed', sets: 2, reps: '60m', recovery: '2 min' },
      { name: 'Flying 20m sprints', detail: '20m build + 20m at maximal velocity with tall hips and fast heels. Time these when possible', sets: reps, reps: '20m flying', recovery: '4-5 min full recovery' },
      { name: 'Sprint-float-sprint (60m)', detail: '30m fast / 10m float / 20m fast — teaches re-acceleration at speed without overloading', sets: Math.max(2, Math.round(2 * mult)), reps: '60m', recovery: '5 min' },
    ],
  };
}

function speedEndMain(phase: Phase, mult: number): ExerciseBlock {
  const reps = Math.max(2, Math.round(3 * mult));
  return {
    title: 'Main Session — Speed Endurance',
    purpose: 'Hold near-maximal speed while fatigue accumulates. Trains lactic tolerance and race-model integrity at 100m-150m pace.',
    items: [
      { name: '150m runs at 95-100% of 150m target pace', detail: 'Stay tall and relaxed — decay happens when form breaks, not when legs tire', sets: reps, reps: '150m', recovery: '6-8 min complete recovery' },
      { name: '120m at 100m race pace', detail: 'Run the first 60m at goal race rhythm, hold mechanics to 120m', sets: Math.max(2, Math.round(2 * mult)), reps: '120m', recovery: '8 min' },
    ],
  };
}

function specialEndMain(phase: Phase, mult: number): ExerciseBlock {
  return {
    title: 'Main Session — Special Endurance (200m focus)',
    purpose: 'Develop the specific energy-system and speed-durability demands of the 200m. Race modelling with full recovery.',
    items: [
      { name: 'Flying 30m at 95%', detail: 'Speed maintenance mechanics at near-max effort', sets: 2, reps: '30m', recovery: '5 min' },
      { name: '150m at 100-110m race rhythm', detail: 'Aggressive curve entry, relax on the curve, re-accelerate on the straight', sets: Math.max(2, Math.round(3 * mult)), reps: '150m', recovery: '8-10 min' },
      { name: '200m race-model run at 90-95%', detail: 'Full race rehearsal: push the curve, lift through the straight, hold mechanics', sets: Math.max(1, Math.round(2 * mult)), reps: '200m', recovery: '10-12 min' },
    ],
  };
}

function tempoMain(phase: Phase, mult: number): ExerciseBlock {
  const reps = Math.max(4, Math.round(6 * mult));
  return {
    title: 'Main Session — General / Tempo Volume',
    purpose: 'Accumulate low-intensity running volume. Builds work capacity, aids recovery, reinforces mechanics without high CNS cost.',
    items: [
      { name: 'Tempo 100m runs at 70-75% effort', detail: 'Relaxed, tall posture, breathe rhythmically. Should feel smooth, not strained', sets: reps, reps: '100m', recovery: '60-90s walk-back' },
      { name: 'Tempo 200m runs at 65-70%', detail: 'Even pacing, no sprinting, focus on mechanics under mild fatigue', sets: Math.max(2, Math.round(3 * mult)), reps: '200m', recovery: '2 min' },
    ],
  };
}

function gymExplosiveBlock(): ExerciseBlock {
  return {
    title: 'Explosive Strength & Plyometrics',
    purpose: 'Convert gym strength into sprint-specific power. Quality contacts and full intent on every rep.',
    items: [
      { name: 'Trap bar jump (or squat jump)', detail: '20-30% of max, jump for height, land softly, reset between reps', sets: 4, reps: '3', recovery: '2 min' },
      { name: 'Depth jumps off 30-45cm box', detail: 'Step off, minimal ground contact time, explode vertically. Stop if contact quality drops', sets: 3, reps: '5', recovery: '2-3 min' },
      { name: 'Bounding (alternate-leg) 20m', detail: 'Maximum horizontal projection, punch the ground back underneath the hips', sets: 3, reps: '20m', recovery: '2 min' },
      { name: 'Single-leg pogo hops', detail: 'Stiff ankle, minimal knee bend, maximum ground contacts per second', sets: 3, reps: '20s each leg', recovery: '90s' },
      { name: 'Med-ball chest throw / rotational throw', detail: 'Maximal intent, full body extension', sets: 3, reps: '5', recovery: '90s' },
    ],
  };
}

function gymStrengthBlock(): ExerciseBlock {
  return {
    title: 'General Strength & Hypertrophy',
    purpose: 'Build the raw strength base that supports sprint-specific power. Heavy compound lifts, controlled tempo.',
    items: [
      { name: 'Trap bar deadlift', detail: 'Bar speed intent on every rep, neutral spine, push the floor away', sets: 4, reps: '3-5 @ 80-88%', recovery: '3 min' },
      { name: 'Back squat (or front squat)', detail: 'Full depth under control, drive up hard', sets: 4, reps: '5 @ 75-82%', recovery: '3 min' },
      { name: 'Nordic hamstring curl / eccentric leg curl', detail: 'Lower for 4-5s, push back up. Key hamstring injury-proofing exercise', sets: 3, reps: '5-6', recovery: '2 min' },
      { name: 'Bulgarian split squat', detail: 'Rear foot elevated, vertical shin on front leg, controlled down, explosive up', sets: 3, reps: '8 each leg', recovery: '90s' },
      { name: 'Single-leg calf raises', detail: 'Full stretch at the bottom, pause, strong contraction up', sets: 4, reps: '12 each leg', recovery: '60s' },
      { name: 'Weighted hip thrust', detail: 'Squeeze glutes hard at the top, ribs down', sets: 3, reps: '8-10', recovery: '90s' },
    ],
  };
}

function mobilityRecoveryBlock(): ExerciseBlock {
  return {
    title: 'Mobility & Regeneration Session',
    purpose: 'Actively restore range of motion and promote blood flow without adding training stress.',
    items: [
      { name: 'Full-body foam rolling sequence', detail: 'Calves, hamstrings, glutes, hip flexors, quads, lats — 60-90s per area', sets: 1, reps: '12 min' },
      { name: 'Hip mobility flow (90/90, deep squat holds, lunge rotations)', detail: 'Move with breath, never force into pain', sets: 2, reps: '8 each position' },
      { name: 'Hamstring flossing / dynamic nerve glides', detail: 'Gentle, rhythmic movement — never aggressive', sets: 2, reps: '10 each leg' },
      { name: 'Thoracic and shoulder openers', detail: 'Wall slides, thread-the-needle, doorway pec stretch', sets: 2, reps: '10 each' },
      { name: 'Ankle mobility and foot strengthening', detail: 'Knee-to-wall rocks, toe yoga, short-foot drills', sets: 2, reps: '10 each' },
      { name: 'Light walk / swimming / bike easy spin', detail: '10-15 min, keep heart rate low, this is about blood flow not fitness', sets: 1, reps: '12 min' },
    ],
  };
}

function prehabBlock(): ExerciseBlock {
  return {
    title: 'Prehab & Tissue Care',
    purpose: 'Build resilience in high-load tissues — hamstrings, calves, Achilles, hip adductors.',
    items: [
      { name: 'Nordic curls (light volume)', detail: '3 sets of 4-5, perfect eccentric control', sets: 3, reps: '4-5', recovery: '90s' },
      { name: 'Isometric split-stance calf hold', detail: '30-45s hold per side at a challenging angle', sets: 3, reps: '30-45s each side', recovery: '60s' },
      { name: 'Copenhagen plank (adductors)', detail: 'Short lever first, progress distance over weeks', sets: 3, reps: '20s each side', recovery: '45s' },
      { name: 'Single-leg RDL with tempo', detail: '3s down, drive up, balance under control', sets: 3, reps: '8 each leg', recovery: '60s' },
    ],
  };
}

export const SESSION_TEMPLATES: Record<string, SessionTemplate> = {
  acceleration: {
    dayType: 'Acceleration + Explosive Strength',
    title: 'Acceleration Development',
    objective: 'Improve first-step power, drive phase mechanics and 0-30m acceleration',
    intensity: 'high',
    build: (phase, mult) => ({
      blocks: [
        warmupBlock('acceleration'),
        mobilityBlock(),
        sprintDrillBlock(),
        accelMain(phase, mult),
        gymExplosiveBlock(),
        cooldownBlock(),
      ],
      target_times: 'Log 10m and 20m splits if you have a laser or timer available.',
      estimated_duration_min: Math.round(90 * (0.7 + 0.3 * mult)),
    }),
  },
  maxvelocity: {
    dayType: 'Maximum Velocity + Plyometrics',
    title: 'Maximum Velocity Development',
    objective: 'Raise top-end speed by exposing the neuromuscular system to true maximal sprinting with full recovery',
    intensity: 'max',
    build: (phase, mult) => ({
      blocks: [
        warmupBlock('max velocity', true),
        mobilityBlock(true),
        sprintDrillBlock(),
        maxVMain(phase, mult),
        gymExplosiveBlock(),
        cooldownBlock(),
      ],
      target_times: 'Target: flying 20m within 5% of your personal best flying time.',
      estimated_duration_min: Math.round(85 * (0.7 + 0.3 * mult)),
    }),
  },
  speedendurance: {
    dayType: 'Speed Endurance',
    title: 'Speed Endurance',
    objective: 'Sustain near-maximal velocity under rising fatigue — 100m and 150m race quality',
    intensity: 'high',
    build: (phase, mult) => ({
      blocks: [
        warmupBlock('speed endurance', true),
        mobilityBlock(true),
        sprintDrillBlock(),
        speedEndMain(phase, mult),
        prehabBlock(),
        cooldownBlock(),
      ],
      target_times: '150m target: current 100m pace +0.4-0.6s per 50m. Adjust as fitness improves.',
      estimated_duration_min: Math.round(80 * (0.7 + 0.3 * mult)),
    }),
  },
  specialendurance: {
    dayType: 'Special Endurance (200m)',
    title: 'Special Endurance — 200m Model',
    objective: 'Build race-specific speed durability for the 200m through curve running and speed maintenance',
    intensity: 'high',
    build: (phase, mult) => ({
      blocks: [
        warmupBlock('special endurance', true),
        mobilityBlock(true),
        sprintDrillBlock(),
        specialEndMain(phase, mult),
        prehabBlock(),
        cooldownBlock(),
      ],
      target_times: '200m target: aim within 5% of your current best modelled time.',
      estimated_duration_min: Math.round(85 * (0.7 + 0.3 * mult)),
    }),
  },
  tempo: {
    dayType: 'Tempo / General Volume',
    title: 'Tempo & General Volume',
    objective: 'Accumulate aerobic and mechanical volume at low intensity to build work capacity and aid recovery',
    intensity: 'moderate',
    build: (phase, mult) => ({
      blocks: [
        warmupBlock('tempo'),
        mobilityBlock(),
        sprintDrillBlock(),
        tempoMain(phase, mult),
        gymStrengthBlock(),
        cooldownBlock(),
      ],
      estimated_duration_min: Math.round(80 * (0.7 + 0.3 * mult)),
    }),
  },
  strength: {
    dayType: 'General Strength & Hypertrophy',
    title: 'General Strength',
    objective: 'Build the strength and tissue-tolerance base that underpins sprint performance',
    intensity: 'moderate',
    build: (phase, mult) => ({
      blocks: [
        warmupBlock('strength'),
        mobilityBlock(),
        sprintDrillBlock(),
        gymStrengthBlock(),
        prehabBlock(),
        cooldownBlock(),
      ],
      estimated_duration_min: Math.round(75 * (0.7 + 0.3 * mult)),
    }),
  },
  mobility: {
    dayType: 'Mobility & Recovery',
    title: 'Mobility & Regeneration',
    objective: 'Actively recover — restore range of motion, promote blood flow, reduce stiffness without adding training stress',
    intensity: 'low',
    build: () => ({
      blocks: [mobilityRecoveryBlock()],
      estimated_duration_min: 40,
    }),
  },
};
