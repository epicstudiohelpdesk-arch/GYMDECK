/**
 * GymDeck Member Mobile - ExerciseDB Movement Encyclopedia Screen
 * Ported from GYMDECK_AI_ML_MODEL/exercisedb-api-main
 * Interactive library of exercises categorized by muscle group, equipment, and difficulty
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  BookOpen,
  Dumbbell,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Award,
  Layers,
} from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { ExerciseDbService, EXERCISE_DATABASE } from '../../src/services/ai/exerciseDbService';
import { ExerciseDbItem } from '../../src/services/ai/types';

export default function ExerciseLibraryScreen() {
  const { colors, radii, spacing, mode } = useTheme();
  const router = useRouter();

  const isDark = mode === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(EXERCISE_DATABASE[0].id);

  const bodyParts = ExerciseDbService.getBodyParts();
  const exercises = ExerciseDbService.filterExercises(searchQuery, selectedBodyPart);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Header */}
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
            ExerciseDB Catalog
          </Text>
          <View style={[styles.badge, { backgroundColor: '#F3E8FF' }]}>
            <BookOpen size={11} color="#7C3AED" />
            <Text style={styles.badgeText}>11,000+ DB</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.md,
            },
          ]}
        >
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search exercises by name, muscle, or equipment..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Body Part Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bodyPartScroll}>
          {bodyParts.map((part) => {
            const isSelected = selectedBodyPart === part;
            return (
              <TouchableOpacity
                key={part}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? '#7C3AED' : colors.surface,
                    borderColor: isSelected ? '#7C3AED' : colors.border,
                  },
                ]}
                onPress={() => setSelectedBodyPart(part)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {part}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Exercises List */}
        <Text style={[styles.countLabel, { color: colors.textMuted }]}>
          Showing {exercises.length} Exercises
        </Text>

        <View style={styles.exercisesList}>
          {exercises.map((ex) => {
            const isExpanded = expandedId === ex.id;
            return (
              <View
                key={ex.id}
                style={[
                  styles.exerciseCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isExpanded ? '#7C3AED' : colors.border,
                    borderWidth: isExpanded ? 1.5 : 1,
                    borderRadius: radii.xl,
                    padding: spacing.lg,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleExpand(ex.id)}
                  style={styles.cardHeaderRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: colors.surfaceSubtle }]}>
                    <Dumbbell size={20} color="#7C3AED" />
                  </View>

                  <View style={styles.cardHeaderInfo}>
                    <Text style={[styles.exerciseTitle, { color: colors.textPrimary }]}>
                      {ex.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.targetPill, { backgroundColor: '#F3E8FF' }]}>
                        <Text style={styles.targetPillText}>{ex.targetMuscle}</Text>
                      </View>
                      <Text style={[styles.equipmentText, { color: colors.textMuted }]}>
                        {ex.equipment}
                      </Text>
                    </View>
                  </View>

                  {isExpanded ? (
                    <ChevronUp size={20} color={colors.textMuted} />
                  ) : (
                    <ChevronDown size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={[styles.expandedContent, { borderTopColor: colors.borderSubtle }]}>
                    {/* Secondary muscles & difficulty */}
                    <View style={styles.detailsMetaGrid}>
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailItemLabel, { color: colors.textMuted }]}>
                          Body Region
                        </Text>
                        <Text style={[styles.detailItemVal, { color: colors.textPrimary }]}>
                          {ex.bodyPart}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={[styles.detailItemLabel, { color: colors.textMuted }]}>
                          Difficulty
                        </Text>
                        <Text style={[styles.detailItemVal, { color: '#10B981' }]}>
                          {ex.difficulty}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={[styles.detailItemLabel, { color: colors.textMuted }]}>
                          Secondary
                        </Text>
                        <Text style={[styles.detailItemVal, { color: colors.textSecondary }]}>
                          {ex.secondaryMuscles.join(', ')}
                        </Text>
                      </View>
                    </View>

                    {/* Step-by-Step Instructions */}
                    <Text style={[styles.stepsHeading, { color: colors.textPrimary }]}>
                      Movement Steps
                    </Text>
                    <View style={styles.stepsList}>
                      {ex.instructions.map((step, idx) => (
                        <View key={idx} style={styles.stepItemRow}>
                          <View
                            style={[
                              styles.stepBadge,
                              { backgroundColor: colors.surfaceSubtle },
                            ]}
                          >
                            <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                          </View>
                          <Text style={[styles.stepItemText, { color: colors.textSecondary }]}>
                            {step}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Form Tips */}
                    {ex.tips.length > 0 && (
                      <View style={[styles.tipsBox, { backgroundColor: colors.surfaceSubtle, borderRadius: radii.md }]}>
                        <Sparkles size={14} color="#7C3AED" />
                        <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
                          <Text style={{ fontWeight: '700' }}>Form Tip: </Text>
                          {ex.tips.join(' ')}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

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
    color: '#7C3AED',
  },
  scrollContent: {
    flexGrow: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  bodyPartScroll: {
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exercisesList: {
    gap: 12,
  },
  exerciseCard: {
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  targetPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  equipmentText: {
    fontSize: 11,
  },
  expandedContent: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 12,
  },
  detailsMetaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailItem: {
    flex: 1,
    gap: 2,
  },
  detailItemLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  detailItemVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepsHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  stepsList: {
    gap: 8,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  stepItemText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  tipsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
