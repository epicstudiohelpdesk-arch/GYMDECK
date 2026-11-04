/**
 * GymDeck Member Mobile - AI/ML Domain Types & Data Contracts
 * Derived from GYMDECK_AI_ML_MODEL specifications:
 * - Gym-Machines-Classifier
 * - Fitness-AI-Trainer (Pose & Repetition Counting)
 * - Cal AI / Fud AI (Nutrition & Calorie Vision)
 * - ExerciseDB
 */

export interface GymMachineCategory {
  id: string;
  name: string;
  canonicalKey: string;
  targetMuscle: string;
  secondaryMuscles: string[];
  equipmentType: 'Machine' | 'Free Weight' | 'Cable';
  description: string;
  instructions: string[];
  videoTutorialUrl: string;
  thumbnailUrl?: string;
  safetyTips: string[];
}

export interface MachinePredictionResult {
  predictedMachine: GymMachineCategory;
  confidence: number; // 0 - 100%
  isConfident: boolean;
  alternativeMatches?: {
    name: string;
    confidence: number;
  }[];
  imageUri?: string;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface FoodNutrientBreakdown {
  calories: number; // kcal
  protein: number;  // grams
  carbs: number;    // grams
  fat: number;      // grams
  fiber?: number;   // grams
}

export interface ScannedFoodItem {
  id: string;
  name: string;
  mealType: MealType;
  portionGrams: number;
  portionDescription: string;
  nutrients: FoodNutrientBreakdown;
  healthScore: number; // 1 - 100
  confidenceScore: number; // 0 - 100%
  imageUrl?: string;
  loggedAt: string;
}

export interface DailyNutritionSummary {
  date: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  consumedCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
  meals: ScannedFoodItem[];
}

export type ExerciseType = 'SQUAT' | 'PUSH_UP' | 'BICEP_CURL' | 'SHOULDER_PRESS' | 'LATERAL_RAISE';

export type RepStage = 'START' | 'DOWN' | 'UP' | 'HOLD';

export interface PoseAngles {
  leftElbow?: number;
  rightElbow?: number;
  leftKnee?: number;
  rightKnee?: number;
  leftHip?: number;
  rightHip?: number;
  leftShoulder?: number;
  rightShoulder?: number;
}

export interface RepCounterFeedback {
  currentStage: RepStage;
  repetitionCount: number;
  lastRepQuality: 'EXCELLENT' | 'GOOD' | 'INCOMPLETE_ROM' | 'TOO_FAST' | 'IMPROVE_FORM';
  liveAngleDegrees: number;
  targetAngleDegrees: number;
  formInstruction: string;
  isGoodForm: boolean;
  cadenceSecondsPerRep?: number;
}

export interface ExerciseDbItem {
  id: string;
  name: string;
  bodyPart: string;
  targetMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instructions: string[];
  tips: string[];
}
