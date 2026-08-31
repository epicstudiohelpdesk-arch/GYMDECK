/**
 * GymDeck Member Mobile - Live Workout Session Tracker Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Dumbbell,
  CheckCircle2,
  Circle,
  Clock,
  ArrowLeft,
  Flame,
  Check,
  StopCircle,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useCompleteWorkoutSession } from '../../src/hooks';
import { PrimaryButton } from '../../src/components';
import { WorkoutSession } from '../../src/types';

// Active in-memory session template for live workout tracking
const INITIAL_SESSION_DATA: WorkoutSession = {
  id: 'sess_live_101',
  routineId: 'wk_chest_hypertrophy',
  routineTitle: 'Chest & Triceps Hypertrophy',
  startTime: new Date().toISOString(),
  status: 'IN_PROGRESS',
  loggedExercises: [
    {
      exerciseId: 'ex_1',
      exerciseName: 'Incline Barbell Bench Press',
      targetMuscle: 'Upper Chest',
      sets: [
        { setNumber: 1, reps: 10, weightKg: 60, isCompleted: true },
        { setNumber: 2, reps: 10, weightKg: 65, isCompleted: true },
        { setNumber: 3, reps: 8, weightKg: 70, isCompleted: false },
        { setNumber: 4, reps: 8, weightKg: 70, isCompleted: false },
      ],
    },
    {
      exerciseId: 'ex_2',
      exerciseName: 'Flat Dumbbell Press',
      targetMuscle: 'Mid Chest',
      sets: [
        { setNumber: 1, reps: 12, weightKg: 26, isCompleted: false },
        { setNumber: 2, reps: 10, weightKg: 28, isCompleted: false },
        { setNumber: 3, reps: 10, weightKg: 28, isCompleted: false },
      ],
    },
    {
      exerciseId: 'ex_3',
      exerciseName: 'Cable Chest Flyes',
      targetMuscle: 'Lower & Inner Chest',
      sets: [
        { setNumber: 1, reps: 15, weightKg: 14, isCompleted: false },
        { setNumber: 2, reps: 15, weightKg: 14, isCompleted: false },
        { setNumber: 3, reps: 12, weightKg: 16, isCompleted: false },
      ],
    },
  ],
};

export default function WorkoutSessionScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const completeMutation = useCompleteWorkoutSession();

  const [session, setSession] = useState<WorkoutSession>(INITIAL_SESSION_DATA);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    setSession((prev) => {
      const updated = { ...prev };
      const currentVal = updated.loggedExercises[exIdx].sets[setIdx].isCompleted;
      updated.loggedExercises[exIdx].sets[setIdx].isCompleted = !currentVal;
      return updated;
    });
  };

  const updateSetWeight = (exIdx: number, setIdx: number, val: string) => {
    const num = parseFloat(val) || 0;
    setSession((prev) => {
      const updated = { ...prev };
      updated.loggedExercises[exIdx].sets[setIdx].weightKg = num;
      return updated;
    });
  };

  const updateSetReps = (exIdx: number, setIdx: number, val: string) => {
    const num = parseInt(val, 10) || 0;
    setSession((prev) => {
      const updated = { ...prev };
      updated.loggedExercises[exIdx].sets[setIdx].reps = num;
      return updated;
    });
  };

  const handleFinishWorkout = () => {
    Alert.alert(
      'Finish Workout',
      'Are you sure you want to log and complete this workout session?',
      [
        { text: 'Keep Training', style: 'cancel' },
        {
          text: 'Finish & Save',
          style: 'default',
          onPress: async () => {
            setIsFinishing(true);
            const duration = Math.max(1, Math.round(secondsElapsed / 60));
            try {
              await completeMutation.mutateAsync({
                sessionId: session.id,
                durationMinutes: duration,
              });
              Alert.alert('Workout Logged! 🎉', 'Your session data and volume have been saved.', [
                {
                  text: 'View History',
                  onPress: () => router.replace('/details/workout-history' as any),
                },
              ]);
            } catch (err) {
              Alert.alert('Error', 'Failed to save workout session to server.');
            } finally {
              setIsFinishing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Workout Top Bar */}
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

        <View style={styles.titleColumn}>
          <Text style={[styles.routineName, { color: colors.textPrimary }]}>
            {session.routineTitle}
          </Text>
          <View style={styles.timerBadge}>
            <Clock size={12} color={colors.brand.primary} />
            <Text style={[styles.timerText, { color: colors.brand.primary }]}>
              {formatTime(secondsElapsed)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleFinishWorkout}
          style={[styles.finishHeaderBtn, { backgroundColor: colors.brand.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Finish workout"
        >
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.finishHeaderText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {session.loggedExercises.map((exercise, exIdx) => (
          <View
            key={exercise.exerciseId}
            style={[
              styles.exerciseCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <View style={[styles.exerciseHeader, { padding: spacing.md }]}>
              <View style={[styles.exPill, { backgroundColor: colors.surfaceSubtle }]}>
                <Dumbbell size={16} color={colors.brand.primary} />
              </View>
              <View style={styles.exHeaderText}>
                <Text style={[styles.exerciseName, { color: colors.textPrimary }]}>
                  {exercise.exerciseName}
                </Text>
                <Text style={[styles.exerciseMuscle, { color: colors.brand.secondary }]}>
                  {exercise.targetMuscle}
                </Text>
              </View>
            </View>

            {/* Set Table Header */}
            <View
              style={[
                styles.tableHeaderRow,
                { borderTopColor: colors.borderSubtle, borderBottomColor: colors.borderSubtle },
              ]}
            >
              <Text style={[styles.colHeader, { width: 40, color: colors.textMuted }]}>SET</Text>
              <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>KG</Text>
              <Text style={[styles.colHeader, { flex: 1, color: colors.textMuted }]}>REPS</Text>
              <Text style={[styles.colHeader, { width: 50, textAlign: 'center', color: colors.textMuted }]}>
                DONE
              </Text>
            </View>

            {/* Sets List */}
            {exercise.sets.map((set, setIdx) => (
              <View
                key={set.setNumber}
                style={[
                  styles.setRow,
                  set.isCompleted && {
                    backgroundColor: colors.surfaceSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.setNumberText,
                    { width: 40, color: colors.textSecondary },
                  ]}
                >
                  {set.setNumber}
                </Text>

                <View style={[styles.inputBox, { flex: 1, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputText, { color: colors.textPrimary }]}
                    keyboardType="numeric"
                    defaultValue={String(set.weightKg)}
                    onChangeText={(val) => updateSetWeight(exIdx, setIdx, val)}
                  />
                </View>

                <View style={[styles.inputBox, { flex: 1, borderColor: colors.border, marginLeft: 8 }]}>
                  <TextInput
                    style={[styles.inputText, { color: colors.textPrimary }]}
                    keyboardType="numeric"
                    defaultValue={String(set.reps)}
                    onChangeText={(val) => updateSetReps(exIdx, setIdx, val)}
                  />
                </View>

                <TouchableOpacity
                  onPress={() => toggleSetComplete(exIdx, setIdx)}
                  style={[
                    styles.checkButton,
                    {
                      width: 50,
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: set.isCompleted }}
                >
                  {set.isCompleted ? (
                    <CheckCircle2 size={24} color={colors.status.success} />
                  ) : (
                    <Circle size={24} color={colors.border} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}

        <PrimaryButton
          title="Complete & Log Workout Session"
          onPress={handleFinishWorkout}
          loading={isFinishing}
          disabled={isFinishing}
          style={{ marginVertical: 16 }}
        />
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  titleColumn: {
    flex: 1,
  },
  routineName: {
    fontSize: 15,
    fontWeight: '800',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  finishHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  finishHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  exerciseCard: {
    width: '100%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exHeaderText: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseMuscle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  setNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  inputText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  checkButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
