/**
 * GymDeck Member Mobile - AI Calorie & Nutrition Scanner Screen
 * Ported from GYMDECK_AI_ML_MODEL (cal_scanner-main, caloriemate-main, fud-ai)
 * Multimodal meal analysis, macro tracking, and persistent daily diary
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  Utensils,
  Flame,
  Sparkles,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  PieChart,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { CalorieVisionService } from '../../src/services/ai/calorieVisionService';
import { ScannedFoodItem, MealType } from '../../src/services/ai/types';

export default function AiNutritionScreen() {
  const { colors, radii, spacing, mode } = useTheme();
  const router = useRouter();

  const isDark = mode === 'dark';

  const {
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
    todayMeals,
    logMeal,
    removeMeal,
    getDailySummary,
  } = useNutritionStore();

  const summary = getDailySummary();

  // Local state
  const [selectedMealType, setSelectedMealType] = useState<MealType>('LUNCH');
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scannedResult, setScannedResult] = useState<ScannedFoodItem | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const presets = CalorieVisionService.getPresetMeals();

  const handleAnalyzeFood = async (customPrompt?: string, photoUri?: string) => {
    const imageToUse = photoUri || capturedPhotoUri || undefined;
    const textToAnalyze = customPrompt || inputText.trim() || (imageToUse ? '' : 'grilled chicken and rice');
    setIsAnalyzing(true);
    setScannedResult(null);

    try {
      const item = await CalorieVisionService.analyzeFood({
        promptText: textToAnalyze,
        imageUri: imageToUse,
        mealType: selectedMealType,
      });
      setScannedResult(item);
    } catch {
      Alert.alert('Analysis Failed', 'Could not analyze food item. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera Access Required',
          'GymDeck AI requires camera permission to scan your meal and calculate nutritional values in real time.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedPhotoUri(uri);
        await handleAnalyzeFood(undefined, uri);
      }
    } catch {
      Alert.alert('Camera Error', 'Could not open camera on this device.');
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo Access Required',
          'GymDeck AI requires photo library permission to select and evaluate meal photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedPhotoUri(uri);
        await handleAnalyzeFood(undefined, uri);
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not access photo library.');
    }
  };

  const handleClearPhoto = () => {
    setCapturedPhotoUri(null);
    setScannedResult(null);
  };

  const handleConfirmLogMeal = () => {
    if (!scannedResult) return;
    logMeal(scannedResult);
    Alert.alert('Meal Logged', `Successfully added ${scannedResult.name} (${scannedResult.nutrients.calories} kcal) to today's diary.`);
    setScannedResult(null);
    setCapturedPhotoUri(null);
    setInputText('');
  };

  const remainingCalories = Math.max(targetCalories - summary.consumedCalories, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            AI Calorie Scanner
          </Text>
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Sparkles size={11} color="#D97706" />
            <Text style={styles.badgeText}>Vision AI</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Macro Summary Card */}
        <View
          style={[
            styles.macroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              padding: spacing.lg,
            },
          ]}
        >
          <View style={styles.macroTopRow}>
            <View>
              <Text style={[styles.calRemainingNumber, { color: colors.textPrimary }]}>
                {remainingCalories}
              </Text>
              <Text style={[styles.calRemainingLabel, { color: colors.textSecondary }]}>
                kcal remaining of {targetCalories} kcal goal
              </Text>
            </View>
            <View style={styles.flameCircle}>
              <Flame size={24} color="#FF5E62" />
            </View>
          </View>

          {/* Macro breakdown pills */}
          <View style={[styles.macroRow, { marginTop: spacing.md }]}>
            <View style={[styles.macroPill, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.macroPillLabel, { color: colors.textMuted }]}>Protein</Text>
              <Text style={[styles.macroPillValue, { color: '#10B981' }]}>
                {summary.consumedProtein} <Text style={styles.unitText}>/ {targetProtein}g</Text>
              </Text>
            </View>

            <View style={[styles.macroPill, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.macroPillLabel, { color: colors.textMuted }]}>Carbs</Text>
              <Text style={[styles.macroPillValue, { color: '#38BDF8' }]}>
                {summary.consumedCarbs} <Text style={styles.unitText}>/ {targetCarbs}g</Text>
              </Text>
            </View>

            <View style={[styles.macroPill, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.macroPillLabel, { color: colors.textMuted }]}>Fats</Text>
              <Text style={[styles.macroPillValue, { color: '#F59E0B' }]}>
                {summary.consumedFat} <Text style={styles.unitText}>/ {targetFat}g</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Input & Scanner Section */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xl }]}>
          Scan or Log a Meal
        </Text>

        {/* Meal Type Picker */}
        <View style={styles.mealTypeRow}>
          {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as MealType[]).map((type) => {
            const isSelected = selectedMealType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.mealTypeBtn,
                  {
                    backgroundColor: isSelected ? '#FF5E62' : colors.surface,
                    borderColor: isSelected ? '#FF5E62' : colors.border,
                  },
                ]}
                onPress={() => setSelectedMealType(type)}
              >
                <Text
                  style={[
                    styles.mealTypeText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Camera Vision Scan Triggers & Photo Preview */}
        {capturedPhotoUri ? (
          <View
            style={[
              styles.capturedPhotoContainer,
              {
                backgroundColor: colors.surface,
                borderColor: '#FDBA74',
                borderRadius: radii.lg,
                padding: spacing.md,
                marginBottom: 14,
              },
            ]}
          >
            <View style={styles.capturedPhotoWrapper}>
              <Image source={{ uri: capturedPhotoUri }} style={styles.capturedPhotoPreview} />
              <View style={[styles.photoActiveBadge, { backgroundColor: '#EA580C' }]}>
                <Camera size={12} color="#FFFFFF" />
                <Text style={styles.photoActiveBadgeText}>Real Camera Capture</Text>
              </View>
              {isAnalyzing && (
                <View style={styles.analyzingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.analyzingOverlayText}>Vision AI Analyzing Meal...</Text>
                </View>
              )}
            </View>

            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={[styles.photoActionBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={handleLaunchCamera}
                disabled={isAnalyzing}
              >
                <RotateCcw size={14} color={colors.textPrimary} />
                <Text style={[styles.photoActionBtnText, { color: colors.textPrimary }]}>Retake Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoActionBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={handleClearPhoto}
                disabled={isAnalyzing}
              >
                <Trash2 size={14} color="#EF4444" />
                <Text style={[styles.photoActionBtnText, { color: '#EF4444' }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cameraActionRow}>
            <TouchableOpacity
              style={[
                styles.cameraHeroBtn,
                {
                  backgroundColor: isDark ? '#1C1917' : '#FFF7ED',
                  borderColor: '#F97316',
                  borderRadius: radii.lg,
                  padding: spacing.md,
                },
              ]}
              onPress={handleLaunchCamera}
              activeOpacity={0.8}
              disabled={isAnalyzing}
            >
              <View style={[styles.cameraCircle, { backgroundColor: '#FFEDD5' }]}>
                <Camera size={24} color="#EA580C" />
              </View>
              <Text style={[styles.cameraHeroTitle, { color: colors.textPrimary }]}>
                Take Meal Photo
              </Text>
              <Text style={[styles.cameraHeroSub, { color: colors.textSecondary }]}>
                Use iPhone camera to scan plate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.galleryHeroBtn,
                {
                  backgroundColor: isDark ? '#181E29' : '#F0F9FF',
                  borderColor: '#38BDF8',
                  borderRadius: radii.lg,
                  padding: spacing.md,
                },
              ]}
              onPress={handleLaunchGallery}
              activeOpacity={0.8}
              disabled={isAnalyzing}
            >
              <View style={[styles.cameraCircle, { backgroundColor: '#E0F2FE' }]}>
                <ImageIcon size={24} color="#0284C7" />
              </View>
              <Text style={[styles.cameraHeroTitle, { color: colors.textPrimary }]}>
                Upload Photo
              </Text>
              <Text style={[styles.cameraHeroSub, { color: colors.textSecondary }]}>
                Select from photo library
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Text Prompt Input */}
        <View
          style={[
            styles.textInputBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
            },
          ]}
        >
          <TextInput
            style={[styles.inputField, { color: colors.textPrimary }]}
            placeholder="Or type food e.g., '2 boiled eggs and oats bowl'..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleAnalyzeFood()}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={[styles.scanActionBtn, { backgroundColor: '#FF5E62' }]}
            onPress={() => handleAnalyzeFood()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Sparkles size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Food Chips */}
        <Text style={[styles.chipsHeading, { color: colors.textMuted }]}>
          Popular Fitness Staples
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.key}
              style={[
                styles.presetChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleAnalyzeFood(preset.key)}
            >
              <Text style={[styles.presetChipText, { color: colors.textPrimary }]}>
                {preset.label}
              </Text>
              <Text style={styles.presetChipKcal}>{preset.calories} kcal</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Analysis Result Modal / Card */}
        {scannedResult && (
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: isDark ? '#1C2030' : '#ECFDF5',
                borderColor: '#10B981',
                borderRadius: radii.xl,
                padding: spacing.lg,
                marginTop: spacing.xl,
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultTitleWrap}>
                <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                  {scannedResult.name}
                </Text>
                <Text style={[styles.resultPortion, { color: colors.textSecondary }]}>
                  {scannedResult.portionDescription}
                </Text>
              </View>
              <View style={[styles.healthScoreBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.healthScoreText}>Score {scannedResult.healthScore}</Text>
              </View>
            </View>

            {scannedResult.imageUrl && (
              <View style={styles.resultImageRow}>
                <Image source={{ uri: scannedResult.imageUrl }} style={styles.resultThumbnail} />
                <View style={styles.resultImageMeta}>
                  <Text style={[styles.resultImageLabel, { color: colors.textPrimary }]}>
                    Scanned Meal Photograph
                  </Text>
                  <Text style={[styles.resultImageSub, { color: colors.textSecondary }]}>
                    Vision AI Decomposed Analysis
                  </Text>
                </View>
              </View>
            )}

            {/* Nutrients Grid */}
            <View style={styles.nutrientsGrid}>
              <View style={styles.nutrientTile}>
                <Text style={styles.nutrientVal}>{scannedResult.nutrients.calories}</Text>
                <Text style={[styles.nutrientLbl, { color: colors.textSecondary }]}>Calories</Text>
              </View>
              <View style={styles.nutrientTile}>
                <Text style={[styles.nutrientVal, { color: '#10B981' }]}>
                  {scannedResult.nutrients.protein}g
                </Text>
                <Text style={[styles.nutrientLbl, { color: colors.textSecondary }]}>Protein</Text>
              </View>
              <View style={styles.nutrientTile}>
                <Text style={[styles.nutrientVal, { color: '#38BDF8' }]}>
                  {scannedResult.nutrients.carbs}g
                </Text>
                <Text style={[styles.nutrientLbl, { color: colors.textSecondary }]}>Carbs</Text>
              </View>
              <View style={styles.nutrientTile}>
                <Text style={[styles.nutrientVal, { color: '#F59E0B' }]}>
                  {scannedResult.nutrients.fat}g
                </Text>
                <Text style={[styles.nutrientLbl, { color: colors.textSecondary }]}>Fat</Text>
              </View>
            </View>

            {/* Confirm Log Button */}
            <TouchableOpacity
              style={[styles.confirmLogBtn, { backgroundColor: '#10B981' }]}
              onPress={handleConfirmLogMeal}
              activeOpacity={0.8}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.confirmLogBtnText}>Log to Daily Diary</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Logged Meals */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: spacing.xxl }]}>
          Today's Logged Meals ({todayMeals.length})
        </Text>

        {todayMeals.length === 0 ? (
          <View
            style={[
              styles.emptyLogBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing.xl,
              },
            ]}
          >
            <Utensils size={32} color={colors.textMuted} />
            <Text style={[styles.emptyLogTitle, { color: colors.textPrimary }]}>
              No meals logged today yet
            </Text>
            <Text style={[styles.emptyLogSub, { color: colors.textSecondary }]}>
              Scan your plate or enter a meal above to track your calories and protein intake.
            </Text>
          </View>
        ) : (
          <View style={styles.mealsList}>
            {todayMeals.map((meal) => (
              <View
                key={meal.id}
                style={[
                  styles.mealItemCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={styles.mealItemLeft}>
                  <View style={[styles.mealTypeTag, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.mealTypeTagText, { color: colors.brand.primary }]}>
                      {meal.mealType}
                    </Text>
                  </View>
                  <Text style={[styles.mealItemName, { color: colors.textPrimary }]}>
                    {meal.name}
                  </Text>
                  <Text style={[styles.mealItemMacros, { color: colors.textMuted }]}>
                    {meal.nutrients.calories} kcal · {meal.nutrients.protein}g P · {meal.nutrients.carbs}g C · {meal.nutrients.fat}g F
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => removeMeal(meal.id)}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete meal"
                >
                  <Trash2 size={16} color={colors.status.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: spacing['3xl'] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  scrollContent: {
    flexGrow: 1,
  },
  macroCard: {
    borderWidth: 1,
  },
  macroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calRemainingNumber: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  calRemainingLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  flameCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFE5E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
  },
  macroPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  macroPillValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  mealTypeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cameraActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  cameraHeroBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryHeroBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraHeroTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  cameraHeroSub: {
    fontSize: 10,
    textAlign: 'center',
  },
  capturedPhotoContainer: {
    borderWidth: 1,
    gap: 10,
  },
  capturedPhotoWrapper: {
    position: 'relative',
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
  },
  capturedPhotoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  photoActiveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  photoActiveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  analyzingOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  resultThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  resultImageMeta: {
    flex: 1,
  },
  resultImageLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultImageSub: {
    fontSize: 11,
  },
  cameraScanBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cameraBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  cameraBoxSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  inputField: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 8,
  },
  scanActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chipsHeading: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    marginBottom: 10,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipKcal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF5E62',
  },
  resultCard: {
    borderWidth: 1.5,
    gap: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resultTitleWrap: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  resultPortion: {
    fontSize: 12,
  },
  healthScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthScoreText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  nutrientsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  nutrientTile: {
    flex: 1,
    alignItems: 'center',
  },
  nutrientVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  nutrientLbl: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  confirmLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  confirmLogBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyLogBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyLogTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyLogSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  mealsList: {
    gap: 10,
  },
  mealItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  mealItemLeft: {
    flex: 1,
  },
  mealTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  mealTypeTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  mealItemName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  mealItemMacros: {
    fontSize: 11,
  },
  deleteBtn: {
    padding: 8,
  },
});
