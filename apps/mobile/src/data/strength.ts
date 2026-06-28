// Strength training for runners.
//
// Runstamp is not a tracker — but runners get faster and stay healthy by
// lifting, so we ship a small library of strength routines keyed to what a
// runner actually needs (stay injury-free, hold form, climb, last a
// marathon, find top-end speed, recover). Each routine prescribes real
// moves from the open exercises-dataset
// (github.com/hasaneyldrm/exercises-dataset): demo GIFs load from its raw
// CDN, so we carry only the metadata + the running-specific prescription.
//
// Pure TS — no react-native imports — so it stays unit-testable per CLAUDE.md.

const ASSET_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

export interface StrengthExercise {
  /** Dataset id, e.g. '0276'. */
  id: string;
  name: string;
  /** Primary muscle the dataset assigns. */
  target: string;
  equipment: string;
  secondary: string[];
  /** Dataset-relative GIF path; resolve with exerciseGif(). */
  gif: string;
}

/** Absolute URL for an exercise's demo GIF on the dataset CDN. */
export function exerciseGif(ex: StrengthExercise): string {
  return ASSET_BASE + ex.gif;
}

export const EXERCISES: StrengthExercise[] = [
  { id: '0276', name: 'Dead bug', target: 'abs', equipment: 'body weight', secondary: ['hip flexors', 'lower back'], gif: 'videos/0276-iny3m5y.gif' },
  { id: '0464', name: 'Front plank with twist', target: 'abs', equipment: 'body weight', secondary: ['obliques', 'shoulders'], gif: 'videos/0464-CosupLu.gif' },
  { id: '3544', name: 'Incline side plank', target: 'abs', equipment: 'body weight', secondary: ['obliques', 'shoulders'], gif: 'videos/3544-5VXmnV5.gif' },
  { id: '0979', name: 'Band horizontal Pallof press', target: 'abs', equipment: 'band', secondary: ['obliques', 'glutes'], gif: 'videos/0979-9pa4H5m.gif' },
  { id: '0489', name: 'Hyperextension', target: 'spine', equipment: 'body weight', secondary: ['glutes', 'hamstrings'], gif: 'videos/0489-zhMwOwE.gif' },
  { id: '0687', name: 'Russian twist', target: 'abs', equipment: 'body weight', secondary: ['obliques'], gif: 'videos/0687-XVDdcoj.gif' },
  { id: '0630', name: 'Mountain climber', target: 'cardiovascular system', equipment: 'body weight', secondary: ['core', 'shoulders'], gif: 'videos/0630-RJgzwny.gif' },
  { id: '0472', name: 'Hanging leg raise', target: 'abs', equipment: 'body weight', secondary: ['hip flexors'], gif: 'videos/0472-I3tsCnC.gif' },
  { id: '3013', name: 'Low glute bridge', target: 'glutes', equipment: 'body weight', secondary: ['hamstrings', 'core'], gif: 'videos/3013-u0cNiij.gif' },
  { id: '3645', name: 'Single-leg glute bridge', target: 'glutes', equipment: 'body weight', secondary: ['hamstrings', 'quads'], gif: 'videos/3645-rmEukuS.gif' },
  { id: '3561', name: 'Glute bridge march', target: 'glutes', equipment: 'body weight', secondary: ['hamstrings', 'quads'], gif: 'videos/3561-GibBPPg.gif' },
  { id: '0628', name: 'Monster walk', target: 'glutes', equipment: 'body weight', secondary: ['hamstrings', 'quads'], gif: 'videos/0628-O95afRA.gif' },
  { id: '0710', name: 'Side hip abduction', target: 'abductors', equipment: 'body weight', secondary: ['glutes', 'quads'], gif: 'videos/0710-7WaDzyL.gif' },
  { id: '0410', name: 'Bulgarian split squat', target: 'quads', equipment: 'dumbbell', secondary: ['glutes', 'hamstrings', 'calves'], gif: 'videos/0410-qx4fgX7.gif' },
  { id: '0431', name: 'Dumbbell step-up', target: 'glutes', equipment: 'dumbbell', secondary: ['quads', 'hamstrings', 'calves'], gif: 'videos/0431-aXtJhlg.gif' },
  { id: '1760', name: 'Dumbbell goblet squat', target: 'quads', equipment: 'dumbbell', secondary: ['glutes', 'hamstrings', 'calves'], gif: 'videos/1760-yn8yg1r.gif' },
  { id: '3470', name: 'Forward lunge', target: 'glutes', equipment: 'body weight', secondary: ['quads', 'hamstrings', 'calves'], gif: 'videos/3470-kMzUs9Y.gif' },
  { id: '3643', name: 'Cossack squat', target: 'glutes', equipment: 'weighted', secondary: ['quads', 'hamstrings', 'calves'], gif: 'videos/3643-GWoKnIm.gif' },
  { id: '1373', name: 'Standing calf raise', target: 'calves', equipment: 'body weight', secondary: ['ankles'], gif: 'videos/1373-bJYHBIN.gif' },
  { id: '1386', name: 'Single-leg calf raise', target: 'calves', equipment: 'body weight', secondary: ['hamstrings', 'glutes'], gif: 'videos/1386-A2upspL.gif' },
  { id: '0727', name: 'Loaded single-leg calf raise', target: 'calves', equipment: 'dumbbell', secondary: ['ankles'], gif: 'videos/0727-fKZgDEO.gif' },
  { id: '0496', name: 'Inverse leg curl', target: 'hamstrings', equipment: 'body weight', secondary: ['glutes', 'calves'], gif: 'videos/0496-ms7tjSG.gif' },
  { id: '1459', name: 'Dumbbell Romanian deadlift', target: 'glutes', equipment: 'dumbbell', secondary: ['hamstrings', 'lower back'], gif: 'videos/1459-rR0LJzx.gif' },
  { id: '0730', name: 'Single-leg platform slide', target: 'hamstrings', equipment: 'body weight', secondary: ['glutes', 'quads'], gif: 'videos/0730-LNE3wfo.gif' },
  { id: '0549', name: 'Kettlebell swing', target: 'glutes', equipment: 'kettlebell', secondary: ['hamstrings', 'core'], gif: 'videos/0549-UHJlbu3.gif' },
  { id: '0514', name: 'Jump squat', target: 'glutes', equipment: 'body weight', secondary: ['quads', 'hamstrings', 'calves'], gif: 'videos/0514-LIlE5Tn.gif' },
  { id: '3582', name: 'Jumping lunge', target: 'glutes', equipment: 'body weight', secondary: ['quads', 'hamstrings', 'calves'], gif: 'videos/3582-PM1PZjg.gif' },
  { id: '1374', name: 'Single-leg box jump-down', target: 'calves', equipment: 'body weight', secondary: ['quads', 'hamstrings', 'glutes'], gif: 'videos/1374-iPm26QU.gif' },
  { id: '3361', name: 'Skater hops', target: 'cardiovascular system', equipment: 'body weight', secondary: ['quads', 'glutes', 'calves'], gif: 'videos/3361-zfNHMN9.gif' },
  { id: '3636', name: 'High knees', target: 'cardiovascular system', equipment: 'body weight', secondary: ['quads', 'hamstrings', 'glutes', 'calves'], gif: 'videos/3636-ealLwvX.gif' },
  { id: '1160', name: 'Burpee', target: 'cardiovascular system', equipment: 'body weight', secondary: ['quads', 'hamstrings', 'shoulders', 'chest'], gif: 'videos/1160-dK9394r.gif' },
  { id: '1604', name: "World's greatest stretch", target: 'hamstrings', equipment: 'body weight', secondary: ['glutes', 'quads', 'calves'], gif: 'videos/1604-DFGXwZr.gif' },
  { id: '1559', name: 'Hip flexor stretch', target: 'glutes', equipment: 'stability ball', secondary: ['quads', 'hamstrings'], gif: 'videos/1559-2LQkNPW.gif' },
  { id: '1564', name: 'Hip flexor & quad stretch', target: 'quads', equipment: 'rope', secondary: ['hamstrings', 'glutes'], gif: 'videos/1564-tFGKm99.gif' },
  { id: '1511', name: 'Hamstring stretch', target: 'hamstrings', equipment: 'body weight', secondary: ['glutes'], gif: 'videos/1511-99rWm7w.gif' },
  { id: '1576', name: 'Lying hamstring stretch', target: 'hamstrings', equipment: 'body weight', secondary: ['glutes'], gif: 'videos/1576-sU5BrfP.gif' },
  { id: '1377', name: 'Wall calf stretch', target: 'calves', equipment: 'body weight', secondary: ['hamstrings'], gif: 'videos/1377-m0tCHqc.gif' },
];

const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): StrengthExercise | undefined {
  return EXERCISE_BY_ID.get(id);
}

export type RunnerNeed = 'prehab' | 'core' | 'power' | 'endurance' | 'speed' | 'mobility';
export type RoutineLevel = 'foundation' | 'build' | 'peak';

export interface NeedMeta {
  key: RunnerNeed;
  /** Short display label. */
  label: string;
  /** One dry line on who this is for. */
  tagline: string;
}

// Order is the order they surface on the Strength screen — staying healthy
// first, sharpening last.
export const NEEDS: NeedMeta[] = [
  { key: 'prehab', label: 'Stay injury-free', tagline: 'The unglamorous work that keeps you running.' },
  { key: 'core', label: 'Hold your form', tagline: 'For the last 10k, when posture goes first.' },
  { key: 'power', label: 'Run the hills', tagline: 'Strength for climbing and finishing hard.' },
  { key: 'endurance', label: 'Last the marathon', tagline: 'Muscular endurance for the long stuff.' },
  { key: 'speed', label: 'Find your top end', tagline: 'Elastic power for turnover and kick.' },
  { key: 'mobility', label: 'Recover & open up', tagline: 'Easy-day flush and range of motion.' },
];

const NEED_BY_KEY = new Map(NEEDS.map((n) => [n.key, n]));

export function needMeta(key: RunnerNeed): NeedMeta {
  // Every Routine.need is a RunnerNeed, so this is always present.
  return NEED_BY_KEY.get(key)!;
}

export interface RoutineItem {
  exerciseId: string;
  sets: number;
  /** Free-form so we can say "10–12", "30 s hold", "12 / side". */
  reps: string;
  restSec: number;
  /** Optional one-line runner cue. */
  note?: string;
}

export interface Routine {
  id: string;
  need: RunnerNeed;
  title: string;
  /** Who / when, e.g. "Twice a week, all season". */
  forWhom: string;
  /** The running payoff, one or two plain lines. */
  why: string;
  level: RoutineLevel;
  frequency: string;
  /** Equipment summary for the card. */
  gear: string;
  /** Rough time including rest, minutes. */
  minutes: number;
  items: RoutineItem[];
}

export const ROUTINES: Routine[] = [
  {
    id: 'prehab-foundations',
    need: 'prehab',
    title: 'Runner’s prehab',
    forWhom: '2–3× a week, all season',
    why: 'Most running injuries trace back to weak hips and lazy glutes. Twenty quiet minutes here is the cheapest insurance you’ll buy.',
    level: 'foundation',
    frequency: '2–3× / week',
    gear: 'Bodyweight + a band',
    minutes: 20,
    items: [
      { exerciseId: '3013', sets: 2, reps: '15', restSec: 45, note: 'Squeeze at the top; keep ribs down.' },
      { exerciseId: '3645', sets: 3, reps: '10 / side', restSec: 45, note: 'Hips dead level — no dipping.' },
      { exerciseId: '0710', sets: 3, reps: '15 / side', restSec: 30 },
      { exerciseId: '0628', sets: 3, reps: '20 steps', restSec: 45, note: 'Band above the knees, stay low.' },
      { exerciseId: '1386', sets: 3, reps: '12 / side', restSec: 45, note: 'Full range, slow on the way down.' },
      { exerciseId: '0730', sets: 3, reps: '8 / side', restSec: 60 },
      { exerciseId: '0276', sets: 3, reps: '10 / side', restSec: 30 },
    ],
  },
  {
    id: 'core-posture',
    need: 'core',
    title: 'Core & posture',
    forWhom: '3× a week, year-round',
    why: 'A run is thousands of single-leg landings. A core that resists rotation keeps your pelvis quiet and your form intact when you’re tired.',
    level: 'foundation',
    frequency: '3× / week',
    gear: 'Bodyweight + a band',
    minutes: 15,
    items: [
      { exerciseId: '0464', sets: 3, reps: '40 s', restSec: 30 },
      { exerciseId: '3544', sets: 3, reps: '30 s / side', restSec: 30 },
      { exerciseId: '0979', sets: 3, reps: '12 / side', restSec: 30, note: 'Resist the rotation — that’s the whole exercise.' },
      { exerciseId: '0276', sets: 3, reps: '12 / side', restSec: 30 },
      { exerciseId: '0489', sets: 3, reps: '12', restSec: 45 },
      { exerciseId: '0687', sets: 3, reps: '20', restSec: 30 },
      { exerciseId: '0472', sets: 3, reps: '8', restSec: 60 },
    ],
  },
  {
    id: 'hills-power',
    need: 'power',
    title: 'Hills & power',
    forWhom: 'Twice a week, base & build',
    why: 'Heavy, low-rep lifting makes you more economical at every pace — same effort, faster splits — and gives you the force to attack a climb.',
    level: 'build',
    frequency: '2× / week',
    gear: 'Dumbbells / kettlebell',
    minutes: 30,
    items: [
      { exerciseId: '1760', sets: 4, reps: '6', restSec: 90, note: 'Go heavy. Drive through mid-foot.' },
      { exerciseId: '0410', sets: 3, reps: '8 / side', restSec: 75 },
      { exerciseId: '0431', sets: 3, reps: '8 / side', restSec: 75, note: 'Knee-height box; don’t push off the bottom foot.' },
      { exerciseId: '1459', sets: 4, reps: '6', restSec: 90, note: 'Hinge at the hips; flat back.' },
      { exerciseId: '0549', sets: 4, reps: '12', restSec: 60, note: 'Hips snap it forward — it’s a hinge, not a squat.' },
      { exerciseId: '1373', sets: 3, reps: '15', restSec: 45 },
    ],
  },
  {
    id: 'marathon-durability',
    need: 'endurance',
    title: 'Marathon durability',
    forWhom: 'Twice a week through the build',
    why: 'The wheels come off late because muscles fatigue, not lungs. Higher reps and slow eccentrics teach your legs to hold pace deep into a race.',
    level: 'build',
    frequency: '2× / week',
    gear: 'Bodyweight + dumbbells',
    minutes: 25,
    items: [
      { exerciseId: '3470', sets: 3, reps: '12 / side', restSec: 45 },
      { exerciseId: '3561', sets: 3, reps: '20 marches', restSec: 45 },
      { exerciseId: '0496', sets: 3, reps: '8', restSec: 60, note: 'Lower for a slow 3-count — the eccentric is the point.' },
      { exerciseId: '3643', sets: 3, reps: '8 / side', restSec: 60 },
      { exerciseId: '0727', sets: 3, reps: '15 / side', restSec: 45, note: 'Calves fail first late in a race — train them tired.' },
      { exerciseId: '0464', sets: 3, reps: '45 s', restSec: 30 },
    ],
  },
  {
    id: 'speed-plyo',
    need: 'speed',
    title: 'Speed & plyometrics',
    forWhom: '1–2× a week, on fresh legs',
    why: 'Top speed is about how hard and fast you hit the ground. Jumps and bounds build the elastic, reactive strength that turns into a faster turnover and a real kick.',
    level: 'peak',
    frequency: '1–2× / week',
    gear: 'Bodyweight + a box',
    minutes: 20,
    items: [
      { exerciseId: '3636', sets: 3, reps: '20 s', restSec: 45, note: 'Fast feet, tall posture — warm-up for what’s next.' },
      { exerciseId: '0514', sets: 4, reps: '6', restSec: 75, note: 'Land soft, reset each rep. Quality over reps.' },
      { exerciseId: '3582', sets: 3, reps: '6 / side', restSec: 75 },
      { exerciseId: '1374', sets: 3, reps: '5 / side', restSec: 90, note: 'Stick the landing and hold it for two seconds.' },
      { exerciseId: '3361', sets: 3, reps: '10 / side', restSec: 60 },
      { exerciseId: '1160', sets: 3, reps: '8', restSec: 60 },
    ],
  },
  {
    id: 'mobility-recovery',
    need: 'mobility',
    title: 'Mobility & recovery',
    forWhom: 'Easy days or after a run',
    why: 'Not training — maintenance. Open the hips, ankles, and hamstrings that running quietly tightens, so the next session moves better.',
    level: 'foundation',
    frequency: 'As needed',
    gear: 'Bodyweight',
    minutes: 15,
    items: [
      { exerciseId: '1604', sets: 2, reps: '5 / side', restSec: 15, note: 'The all-in-one runner opener.' },
      { exerciseId: '1559', sets: 2, reps: '30 s / side', restSec: 15 },
      { exerciseId: '1564', sets: 2, reps: '30 s / side', restSec: 15 },
      { exerciseId: '1511', sets: 2, reps: '30 s / side', restSec: 15 },
      { exerciseId: '1576', sets: 2, reps: '30 s / side', restSec: 15 },
      { exerciseId: '1377', sets: 2, reps: '30 s / side', restSec: 15 },
    ],
  },
];

const ROUTINE_BY_ID = new Map(ROUTINES.map((r) => [r.id, r]));

export function getRoutine(id: string): Routine | undefined {
  return ROUTINE_BY_ID.get(id);
}

export function routinesForNeed(need: RunnerNeed): Routine[] {
  return ROUTINES.filter((r) => r.need === need);
}

/** Distinct exercises a routine uses, in prescribed order. */
export function routineExercises(routine: Routine): StrengthExercise[] {
  const out: StrengthExercise[] = [];
  for (const item of routine.items) {
    const ex = getExercise(item.exerciseId);
    if (ex) out.push(ex);
  }
  return out;
}
