/**
 * GymDeck Member Mobile - AI Pose Estimation & Repetition Counting Coach
 * Ported from GYMDECK_AI_ML_MODEL/Fitness-AI-Trainer-With-Automatic-Exercise-Recognition-and-Counting-main
 * Mathematical kinematics and multi-stage finite state machines for automated rep counting & form feedback
 */

import { ExerciseType, RepStage, RepCounterFeedback, PoseAngles } from './types';

export interface ExerciseBiomechanicalConfig {
  name: string;
  targetJoint: string;
  downThresholdDegrees: number;
  upThresholdDegrees: number;
  perfectRomDegrees: number;
  primaryMuscles: string;
  cueDown: string;
  cueUp: string;
  commonMistake: string;
}

export const EXERCISE_CONFIGS: Record<ExerciseType, ExerciseBiomechanicalConfig> = {
  SQUAT: {
    name: 'Bodyweight & Barbell Squats',
    targetJoint: 'Knee & Hip Angle',
    downThresholdDegrees: 95,
    upThresholdDegrees: 160,
    perfectRomDegrees: 85,
    primaryMuscles: 'Quadriceps, Glutes, Hamstrings',
    cueDown: 'Lower hips until thighs are parallel or below.',
    cueUp: 'Drive through mid-foot and stand tall.',
    commonMistake: 'Stopping too high or letting knees cave inward.',
  },
  PUSH_UP: {
    name: 'Standard Push-Ups',
    targetJoint: 'Elbow & Shoulder Angle',
    downThresholdDegrees: 90,
    upThresholdDegrees: 160,
    perfectRomDegrees: 80,
    primaryMuscles: 'Chest, Anterior Delts, Triceps',
    cueDown: 'Lower chest to floor with elbows at 45° angle.',
    cueUp: 'Press floor away and reach full lockout.',
    commonMistake: 'Flaring elbows 90° or sagging lumbar spine.',
  },
  BICEP_CURL: {
    name: 'Dumbbell & Cable Bicep Curls',
    targetJoint: 'Elbow Flexion Angle',
    downThresholdDegrees: 150,
    upThresholdDegrees: 45,
    perfectRomDegrees: 40,
    primaryMuscles: 'Biceps Brachii, Brachialis',
    cueDown: 'Extend arm fully for complete eccentric stretch.',
    cueUp: 'Curl weight upward keeping elbows pinned at ribs.',
    commonMistake: 'Swinging torso or using momentum from shoulders.',
  },
  SHOULDER_PRESS: {
    name: 'Overhead Dumbbell Shoulder Press',
    targetJoint: 'Elbow & Shoulder Extension',
    downThresholdDegrees: 85,
    upThresholdDegrees: 160,
    perfectRomDegrees: 165,
    primaryMuscles: 'Deltoids, Upper Trapezius, Triceps',
    cueDown: 'Lower weights to ear level with forearms vertical.',
    cueUp: 'Press vertically overhead without arching lower back.',
    commonMistake: 'Excessive lumbar arching or pressing too far forward.',
  },
  LATERAL_RAISE: {
    name: 'Dumbbell Lateral Raises',
    targetJoint: 'Shoulder Abduction Angle',
    downThresholdDegrees: 25,
    upThresholdDegrees: 85,
    perfectRomDegrees: 90,
    primaryMuscles: 'Lateral Deltoids (Side Delts)',
    cueDown: 'Lower weights slowly, stopping just before thighs.',
    cueUp: 'Lead with elbows until arms are parallel to floor.',
    commonMistake: 'Using heavy weight and shrugging with upper traps.',
  },
};

export class PoseCoachService {
  /**
   * Calculates angle between three 2D/3D points (A, B, C) where B is the vertex.
   * Direct port of calculate_angle(a, b, c) from ExerciseAiTrainer.py
   */
  public static calculateAngle(
    a: [number, number],
    b: [number, number],
    c: [number, number]
  ): number {
    const radians =
      Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0]);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360.0 - angle;
    }
    return Math.round(angle * 10) / 10;
  }

  /**
   * Processes a single kinematic frame through the exercise finite state machine.
   * Detects stage transitions and validates repetition counts.
   */
  public static processRepetitionFrame(
    exercise: ExerciseType,
    currentStage: RepStage,
    currentCount: number,
    currentAngle: number,
    repStartTimeMs?: number
  ): RepCounterFeedback {
    const config = EXERCISE_CONFIGS[exercise];
    let nextStage: RepStage = currentStage;
    let nextCount: number = currentCount;
    let quality: RepCounterFeedback['lastRepQuality'] = 'GOOD';
    let formInstruction: string = config.cueDown;
    let isGoodForm = true;

    if (exercise === 'BICEP_CURL') {
      // In bicep curl, extension (down) is large angle (>150°), flexion (up) is small angle (<45°)
      if (currentAngle > config.downThresholdDegrees) {
        nextStage = 'DOWN';
        formInstruction = config.cueUp;
      } else if (currentAngle < config.upThresholdDegrees && currentStage === 'DOWN') {
        nextStage = 'UP';
        nextCount += 1;
        quality = currentAngle <= config.perfectRomDegrees ? 'EXCELLENT' : 'GOOD';
        formInstruction = 'Great squeeze! Lower under control.';
      }
    } else {
      // Squats, Pushups, Shoulder Press: Down is small angle, Up is large angle
      if (currentAngle <= config.downThresholdDegrees) {
        nextStage = 'DOWN';
        formInstruction = config.cueUp;
        if (currentAngle <= config.perfectRomDegrees) {
          isGoodForm = true;
        }
      } else if (currentAngle >= config.upThresholdDegrees && nextStage === 'DOWN') {
        nextStage = 'UP';
        nextCount += 1;
        quality = 'EXCELLENT';
        formInstruction = 'Solid rep! Reset and descend again.';
      }
    }

    let cadence: number | undefined;
    if (repStartTimeMs && nextCount > currentCount) {
      cadence = Math.round(((Date.now() - repStartTimeMs) / 1000) * 10) / 10;
    }

    return {
      currentStage: nextStage,
      repetitionCount: nextCount,
      lastRepQuality: quality,
      liveAngleDegrees: currentAngle,
      targetAngleDegrees: config.perfectRomDegrees,
      formInstruction,
      isGoodForm,
      cadenceSecondsPerRep: cadence,
    };
  }

  /**
   * Simulates a continuous realistic workout cycle for interactive demo & visual coaching.
   */
  public static getNextSimulatedAngle(
    exercise: ExerciseType,
    tick: number
  ): { angle: number; stage: RepStage } {
    const config = EXERCISE_CONFIGS[exercise];
    const minAngle = config.perfectRomDegrees - 5;
    const maxAngle = config.upThresholdDegrees + 10;
    const amplitude = (maxAngle - minAngle) / 2;
    const midPoint = minAngle + amplitude;

    // Smooth sinusoidal motion cycle (period = 24 ticks ~ 3.6 seconds per rep)
    const normalized = Math.sin((tick * Math.PI) / 12);
    const angle = Math.round(midPoint + amplitude * normalized);
    const stage: RepStage = normalized < -0.6 ? 'DOWN' : normalized > 0.6 ? 'UP' : 'HOLD';

    return { angle, stage };
  }
}

export default PoseCoachService;
