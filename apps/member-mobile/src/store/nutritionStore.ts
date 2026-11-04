/**
 * GymDeck Member Mobile - Nutrition & Calorie Store
 * Manages daily meal logs, calorie targets, and macro split tracking
 * Backed by FastAppStorage (MMKV) for instant persistence
 */

import { create } from 'zustand';
import { ScannedFoodItem, DailyNutritionSummary } from '../services/ai/types';
import { FastAppStorage } from '../services/storage/FastAppStorage';

interface NutritionState {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  todayMeals: ScannedFoodItem[];

  // Actions
  logMeal: (meal: ScannedFoodItem) => void;
  removeMeal: (id: string) => void;
  setTargets: (targets: { calories: number; protein: number; carbs: number; fat: number }) => void;
  getDailySummary: () => DailyNutritionSummary;
  clearTodayMeals: () => void;
}

const STORAGE_KEY_MEALS = 'gymdeck_nutrition_today_meals';
const STORAGE_KEY_TARGETS = 'gymdeck_nutrition_targets';

const DEFAULT_TARGETS = {
  calories: 2200,
  protein: 140,
  carbs: 240,
  fat: 65,
};

const getInitialMeals = (): ScannedFoodItem[] => {
  const cached = FastAppStorage.getObject<ScannedFoodItem[]>(STORAGE_KEY_MEALS);
  return cached || [];
};

const getInitialTargets = () => {
  const cached = FastAppStorage.getObject<typeof DEFAULT_TARGETS>(STORAGE_KEY_TARGETS);
  return cached || DEFAULT_TARGETS;
};

export const useNutritionStore = create<NutritionState>((set, get) => ({
  targetCalories: getInitialTargets().calories,
  targetProtein: getInitialTargets().protein,
  targetCarbs: getInitialTargets().carbs,
  targetFat: getInitialTargets().fat,
  todayMeals: getInitialMeals(),

  logMeal: (meal: ScannedFoodItem) => {
    set((state) => {
      const updated = [meal, ...state.todayMeals];
      FastAppStorage.setObject(STORAGE_KEY_MEALS, updated);
      return { todayMeals: updated };
    });
  },

  removeMeal: (id: string) => {
    set((state) => {
      const updated = state.todayMeals.filter((m) => m.id !== id);
      FastAppStorage.setObject(STORAGE_KEY_MEALS, updated);
      return { todayMeals: updated };
    });
  },

  setTargets: (targets) => {
    set({
      targetCalories: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
    });
    FastAppStorage.setObject(STORAGE_KEY_TARGETS, targets);
  },

  clearTodayMeals: () => {
    set({ todayMeals: [] });
    FastAppStorage.removeItem(STORAGE_KEY_MEALS);
  },

  getDailySummary: (): DailyNutritionSummary => {
    const { targetCalories, targetProtein, targetCarbs, targetFat, todayMeals } = get();
    const consumedCalories = todayMeals.reduce((acc, m) => acc + m.nutrients.calories, 0);
    const consumedProtein = Math.round(todayMeals.reduce((acc, m) => acc + m.nutrients.protein, 0));
    const consumedCarbs = Math.round(todayMeals.reduce((acc, m) => acc + m.nutrients.carbs, 0));
    const consumedFat = Math.round(todayMeals.reduce((acc, m) => acc + m.nutrients.fat, 0));

    return {
      date: new Date().toISOString().split('T')[0],
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      consumedCalories,
      consumedProtein,
      consumedCarbs,
      consumedFat,
      meals: todayMeals,
    };
  },
}));

export default useNutritionStore;
