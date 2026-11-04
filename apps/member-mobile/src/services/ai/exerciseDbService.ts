/**
 * GymDeck Member Mobile - ExerciseDB Movement Encyclopedia Service
 * Ported from GYMDECK_AI_ML_MODEL/exercisedb-api-main
 * High-performance indexed exercise database with biomechanical execution steps
 */

import { ExerciseDbItem } from './types';

export const EXERCISE_DATABASE: ExerciseDbItem[] = [
  {
    id: 'ex_bench_press',
    name: 'Barbell Flat Bench Press',
    bodyPart: 'Chest',
    targetMuscle: 'Pectoralis Major',
    secondaryMuscles: ['Triceps', 'Anterior Deltoids'],
    equipment: 'Barbell & Bench',
    difficulty: 'Intermediate',
    instructions: [
      'Lie flat on bench with eyes positioned directly under the racked bar.',
      'Grip the bar slightly wider than shoulder width with thumbs wrapped around.',
      'Retract and depress shoulder blades, planting feet firmly into the floor.',
      'Unrack and lower bar smoothly to lower-mid sternum, keeping elbows at roughly 45° angle.',
      'Press the bar explosively back to starting position without flaring elbows.',
    ],
    tips: ['Keep wrists neutral over elbows.', 'Do not bounce the bar off your chest.'],
  },
  {
    id: 'ex_incline_dumbbell',
    name: 'Incline Dumbbell Chest Press',
    bodyPart: 'Chest',
    targetMuscle: 'Clavicular Head (Upper Chest)',
    secondaryMuscles: ['Front Deltoids', 'Triceps'],
    equipment: 'Dumbbells & Incline Bench',
    difficulty: 'Beginner',
    instructions: [
      'Set bench to a 30-degree incline.',
      'Kick dumbbells up to shoulder height using your knees as you lie back.',
      'Press weights straight up until arms are extended, rotating hands slightly inward at peak.',
      'Lower slowly over 3 seconds until dumbbells reach chest level.',
    ],
    tips: ['Avoid inclines steeper than 30-45° to keep focus on upper chest rather than front deltoids.'],
  },
  {
    id: 'ex_barbell_squat',
    name: 'Barbell Back Squat',
    bodyPart: 'Legs',
    targetMuscle: 'Quadriceps & Glutes',
    secondaryMuscles: ['Hamstrings', 'Adductors', 'Erectors', 'Core'],
    equipment: 'Barbell & Squat Rack',
    difficulty: 'Intermediate',
    instructions: [
      'Set bar on upper traps (high bar) or across rear deltoids (low bar).',
      'Step back with feet shoulder-width apart, toes pointed slightly outward (15-30°).',
      'Take a deep belly breath and brace core tight (Valsalva maneuver).',
      'Break at hips and knees simultaneously, descending until hip crease is below knee cap.',
      'Drive out of the hole by pressing through mid-foot and keeping chest upright.',
    ],
    tips: ['Keep knees tracking in line with toes.', 'Maintain a neutral spine throughout.'],
  },
  {
    id: 'ex_romanian_deadlift',
    name: 'Romanian Deadlift (RDL)',
    bodyPart: 'Legs',
    targetMuscle: 'Hamstrings & Glutes',
    secondaryMuscles: ['Erector Spinae', 'Forearms/Grip'],
    equipment: 'Barbell or Dumbbells',
    difficulty: 'Intermediate',
    instructions: [
      'Stand upright holding bar at thigh level with overhand grip.',
      'Unlock knees with a slight 15-degree bend and keep knee angle constant.',
      'Push hips backward as far as possible, tracing the bar closely down your shins.',
      'Stop when you feel maximum hamstring stretch (usually mid-shin level).',
      'Drive hips forward forcefully to return to standing lockout.',
    ],
    tips: ['Think of shutting a door with your glutes.', 'Do not turn this into a squat by bending knees further.'],
  },
  {
    id: 'ex_lat_pulldown',
    name: 'Wide-Grip Lat Pulldown',
    bodyPart: 'Back',
    targetMuscle: 'Latissimus Dorsi',
    secondaryMuscles: ['Biceps', 'Rhomboids', 'Teres Major'],
    equipment: 'Cable Machine',
    difficulty: 'Beginner',
    instructions: [
      'Sit comfortably with thighs firmly wedged under roller pads.',
      'Grip the angled ends of the bar with palms facing away.',
      'Initiate pull by retracting scapulae, driving elbows downwards toward back pockets.',
      'Touch bar gently to upper chest, squeeze lats, and resist the weight on the way up.',
    ],
    tips: ['Do not lean back more than 15 degrees.', 'Focus on pulling with your elbows.'],
  },
  {
    id: 'ex_barbell_bent_row',
    name: 'Barbell Bent-Over Row',
    bodyPart: 'Back',
    targetMuscle: 'Mid-Back & Rhomboids',
    secondaryMuscles: ['Lats', 'Biceps', 'Posterior Deltoids', 'Lower Back'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    instructions: [
      'Hinge forward at hips with torso at roughly 45 degrees to the floor.',
      'Grip bar with hands just outside shoulder width.',
      'Pull bar towards your belly button, driving elbows back behind torso.',
      'Hold the contraction for 1 second, then lower slowly until arms hang straight.',
    ],
    tips: ['Keep core braced to protect lumbar spine.', 'Avoid using leg drive to jerk the bar up.'],
  },
  {
    id: 'ex_overhead_press',
    name: 'Standing Military Barbell Overhead Press',
    bodyPart: 'Shoulders',
    targetMuscle: 'Anterior & Lateral Deltoids',
    secondaryMuscles: ['Triceps', 'Upper Chest', 'Core'],
    equipment: 'Barbell',
    difficulty: 'Intermediate',
    instructions: [
      'Rest bar across upper clavicle with elbows pointing slightly forward.',
      'Squeeze glutes and brace abs to create a rock-solid foundation.',
      'Tilt chin slightly back and press bar vertically straight overhead.',
      'Once bar clears head, push head gently forward to lock out bar directly over shoulders and heels.',
    ],
    tips: ['Do not lean backward or hyper-extend spine.', 'Keep forearms vertical throughout.'],
  },
  {
    id: 'ex_lateral_raise',
    name: 'Standing Dumbbell Lateral Raise',
    bodyPart: 'Shoulders',
    targetMuscle: 'Lateral Deltoids (Side Delts)',
    secondaryMuscles: ['Upper Trapezius'],
    equipment: 'Dumbbells',
    difficulty: 'Beginner',
    instructions: [
      'Hold dumbbells by your sides with slight forward torso lean (10°).',
      'Lead with elbows as you sweep weights upward in a wide arc.',
      'Raise until arms reach shoulder height (parallel to floor).',
      'Pause briefly, then lower slowly over 2 seconds.',
    ],
    tips: ['Pour water motion is outdated; keep hands and elbows in line.', 'Use moderate weight with strict tempo.'],
  },
  {
    id: 'ex_incline_bicep_curl',
    name: 'Incline Dumbbell Bicep Curl',
    bodyPart: 'Arms',
    targetMuscle: 'Biceps (Long Head)',
    secondaryMuscles: ['Brachialis', 'Forearms'],
    equipment: 'Dumbbells & Incline Bench',
    difficulty: 'Beginner',
    instructions: [
      'Sit back on a 45-degree incline bench with arms hanging straight down.',
      'With palms facing forward, curl weights up while keeping elbows pointed down at the floor.',
      'Squeeze biceps at the top of the contraction.',
      'Lower weights all the way to full extension for maximal eccentric stretch.',
    ],
    tips: ['Keep upper arms stationary; do not swing elbows forward.'],
  },
  {
    id: 'ex_tricep_rope_pushdown',
    name: 'Cable Tricep Rope Pushdown',
    bodyPart: 'Arms',
    targetMuscle: 'Triceps (Lateral & Medial Heads)',
    secondaryMuscles: ['Tricep Long Head'],
    equipment: 'Cable Machine & Rope Attachment',
    difficulty: 'Beginner',
    instructions: [
      'Attach rope to high pulley, gripping near knotted ends.',
      'Pin elbows firmly to ribs with a slight forward hip hinge.',
      'Extend arms downward, spreading rope ends apart at the bottom lockout.',
      'Return to 90 degrees of elbow flexion under control.',
    ],
    tips: ['Keep elbows glued in place; do not let them drift back and forth.'],
  },
  {
    id: 'ex_hanging_leg_raise',
    name: 'Hanging Leg Raise / Knee Raise',
    bodyPart: 'Core',
    targetMuscle: 'Lower Rectus Abdominis',
    secondaryMuscles: ['Hip Flexors', 'Obliques', 'Grip'],
    equipment: 'Pull-Up Bar',
    difficulty: 'Intermediate',
    instructions: [
      'Hang from bar with active shoulders to protect rotator cuff.',
      'Exhale and roll pelvis upward as you raise legs or knees toward chest.',
      'Do not just lift thighs with hip flexors; actively curl your pelvis.',
      'Lower slowly without swinging.',
    ],
    tips: ['Avoid swinging; reset dead-hang at bottom of every rep.'],
  },
  {
    id: 'ex_cable_woodchopper',
    name: 'Cable High-to-Low Woodchopper',
    bodyPart: 'Core',
    targetMuscle: 'Internal & External Obliques',
    secondaryMuscles: ['Transverse Abdominis', 'Shoulders'],
    equipment: 'Cable Machine',
    difficulty: 'Intermediate',
    instructions: [
      'Set pulley to highest position with single handle.',
      'Stand sideways to machine, grasping handle with both hands.',
      'Rotate torso diagonally downward across body toward opposite knee.',
      'Pivot on rear foot as hips and shoulders turn together.',
      'Return smoothly against cable resistance.',
    ],
    tips: ['Movement is driven by core rotation, not arm pulling.'],
  },
];

export class ExerciseDbService {
  public static getAllExercises(): ExerciseDbItem[] {
    return EXERCISE_DATABASE;
  }

  public static getExerciseById(id: string): ExerciseDbItem | undefined {
    return EXERCISE_DATABASE.find((ex) => ex.id === id);
  }

  public static getBodyParts(): string[] {
    return ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
  }

  public static filterExercises(query: string, bodyPart?: string): ExerciseDbItem[] {
    const q = query.trim().toLowerCase();
    return EXERCISE_DATABASE.filter((ex) => {
      const matchesQuery =
        !q ||
        ex.name.toLowerCase().includes(q) ||
        ex.targetMuscle.toLowerCase().includes(q) ||
        ex.equipment.toLowerCase().includes(q) ||
        ex.secondaryMuscles.some((sm) => sm.toLowerCase().includes(q));

      const matchesBodyPart = !bodyPart || bodyPart === 'All' || ex.bodyPart === bodyPart;

      return matchesQuery && matchesBodyPart;
    });
  }
}

export default ExerciseDbService;
