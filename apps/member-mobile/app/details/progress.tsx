/**
 * GymDeck Member Mobile - Fitness Progress & Measurements Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Scale,
  Ruler,
  Award,
  TrendingDown,
  Plus,
  CheckCircle2,
  Calendar,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import {
  useWeightHistory,
  useBodyMeasurements,
  useMilestones,
  useLogWeight,
} from '../../src/hooks';
import { SkeletonLoader, PrimaryButton } from '../../src/components';

export default function ProgressScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { data: weightLogs, isLoading: wtLoading, refetch: refetchWt } = useWeightHistory();
  const { data: measurements, isLoading: bmLoading } = useBodyMeasurements();
  const { data: milestones, isLoading: msLoading } = useMilestones();
  const logWeightMutation = useLogWeight();

  const [newWeight, setNewWeight] = useState('');
  const [showLogInput, setShowLogInput] = useState(false);

  const handleSaveWeight = async () => {
    const num = parseFloat(newWeight);
    if (!num || num < 30 || num > 300) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kilograms (e.g. 78.5).');
      return;
    }

    try {
      await logWeightMutation.mutateAsync(num);
      setNewWeight('');
      setShowLogInput(false);
      Alert.alert('Success', 'Weight measurement saved.');
    } catch (err) {
      Alert.alert('Error', 'Failed to save weight log.');
    }
  };

  const weights = weightLogs || [];
  const latestWeight = weights[0]?.weightKg || 0;
  const previousWeight = weights[1]?.weightKg || latestWeight;
  const weightDiff = (latestWeight - previousWeight).toFixed(1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Fitness Progress
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={wtLoading}
            onRefresh={refetchWt}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        {/* Weight Hero Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
              padding: spacing.xl,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                CURRENT BODY WEIGHT
              </Text>
              <View style={styles.weightNumRow}>
                <Text style={[styles.bigWeight, { color: colors.textPrimary }]}>
                  {latestWeight > 0 ? latestWeight.toFixed(1) : '--'}
                </Text>
                <Text style={[styles.unitText, { color: colors.brand.primary }]}>kg</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowLogInput(!showLogInput)}
              style={[
                styles.addLogBtn,
                { backgroundColor: colors.brand.primary, borderRadius: radii.md },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Log new body weight"
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addLogText}>Log Weight</Text>
            </TouchableOpacity>
          </View>

          {showLogInput && (
            <View style={[styles.logInputContainer, { borderTopColor: colors.borderSubtle }]}>
              <TextInput
                style={[
                  styles.weightInput,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    borderRadius: radii.md,
                  },
                ]}
                placeholder="e.g. 78.5"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newWeight}
                onChangeText={setNewWeight}
              />
              <PrimaryButton
                title="Save"
                onPress={handleSaveWeight}
                loading={logWeightMutation.isPending}
                style={{ height: 44, width: 80 }}
              />
            </View>
          )}

          {/* Historical Logs List */}
          <View style={[styles.weightHistoryBox, { borderTopColor: colors.borderSubtle }]}>
            <Text style={[styles.historySubtitle, { color: colors.textMuted }]}>
              Recent Weight Log History
            </Text>
            {weights.slice(0, 4).map((w) => (
              <View key={w.id} style={styles.weightLogRow}>
                <Text style={[styles.logDate, { color: colors.textSecondary }]}>{w.date}</Text>
                <Text style={[styles.logVal, { color: colors.textPrimary }]}>
                  {w.weightKg.toFixed(1)} kg {w.bmi ? `· BMI ${w.bmi}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Body Measurements Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ruler size={16} color={colors.brand.secondary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Body Circumference Measurements
            </Text>
          </View>

          <View
            style={[
              styles.measurementCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.lg,
                padding: spacing.lg,
              },
            ]}
          >
            {measurements && measurements[0] ? (
              <View style={styles.gridContainer}>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: colors.textMuted }]}>CHEST</Text>
                  <Text style={[styles.gridVal, { color: colors.textPrimary }]}>
                    {measurements[0].chestCm} cm
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: colors.textMuted }]}>WAIST</Text>
                  <Text style={[styles.gridVal, { color: colors.textPrimary }]}>
                    {measurements[0].waistCm} cm
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: colors.textMuted }]}>ARMS</Text>
                  <Text style={[styles.gridVal, { color: colors.textPrimary }]}>
                    {measurements[0].armsCm} cm
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={[styles.gridLabel, { color: colors.textMuted }]}>THIGHS</Text>
                  <Text style={[styles.gridVal, { color: colors.textPrimary }]}>
                    {measurements[0].thighsCm} cm
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary }}>No measurement data available.</Text>
            )}
          </View>
        </View>

        {/* Milestones Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={16} color={colors.brand.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Fitness Milestones & Badges
            </Text>
          </View>

          <View style={[styles.milestonesList, { gap: spacing.md }]}>
            {(milestones || []).map((m) => (
              <View
                key={m.id}
                style={[
                  styles.milestoneCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={[styles.msIconCircle, { backgroundColor: colors.surfaceSubtle }]}>
                  <Award size={20} color={colors.brand.primary} />
                </View>
                <View style={styles.msTextWrapper}>
                  <Text style={[styles.msTitle, { color: colors.textPrimary }]}>{m.title}</Text>
                  <Text style={[styles.msDesc, { color: colors.textSecondary }]}>
                    {m.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: spacing.xl }} />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroCard: {
    width: '100%',
    borderWidth: 1,
    marginBottom: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  weightNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  bigWeight: {
    fontSize: 36,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 18,
    fontWeight: '700',
  },
  addLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addLogText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  weightHistoryBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  historySubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  weightLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logDate: {
    fontSize: 12,
  },
  logVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  measurementCard: {
    width: '100%',
    borderWidth: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  milestonesList: {
    width: '100%',
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  msIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msTextWrapper: {
    flex: 1,
  },
  msTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  msDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
