/**
 * GymDeck Owner Mobile - Assign Personal Trainer Modal
 *
 * Light-first canonical experience with dark theme toggle support.
 * Uses standard BottomSheet primitive with trainer search, profile badges,
 * current assignment context, and coaching objectives.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerTrainersService } from '../services/api/ownerTrainersService';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { TrainerSummary } from '../types';
import { useTheme } from '../theme';
import { BottomSheet } from './ui/BottomSheet';
import { PrimaryButton, SecondaryButton } from './ui/Button';
import {
  Award,
  Search,
  Check,
  UserCheck,
  User,
  Dumbbell,
  FileText,
  AlertCircle,
  Star,
  X,
  Sparkles,
} from 'lucide-react-native';

interface AssignTrainerModalProps {
  visible: boolean;
  memberId: string;
  memberName: string;
  currentTrainerId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignTrainerModal: React.FC<AssignTrainerModalProps> = ({
  visible,
  memberId,
  memberName,
  currentTrainerId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { colors, typography, radii, shadows } = useTheme();

  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial trainer selection and reset fields on open
  useEffect(() => {
    if (visible) {
      setSelectedTrainerId(currentTrainerId || '');
      setSearchQuery('');
      setNotes('');
      setErrorMessage(null);
    }
  }, [visible, currentTrainerId]);

  // Fetch available trainers from gym directory
  const { data: trainers, isLoading: isTrainersLoading } = useQuery({
    queryKey: ['owner-trainers-list'],
    queryFn: () => OwnerTrainersService.getTrainers(false),
    enabled: visible,
  });

  // Filter trainers based on search query
  const filteredTrainers = useMemo(() => {
    if (!trainers) return [];
    if (!searchQuery.trim()) return trainers;
    const q = searchQuery.toLowerCase().trim();
    return trainers.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        (t.specialization && t.specialization.toLowerCase().includes(q))
    );
  }, [trainers, searchQuery]);

  // Current trainer object
  const currentTrainer = (trainers || []).find((t) => t.id === currentTrainerId);
  const selectedTrainer = (trainers || []).find((t) => t.id === selectedTrainerId);

  // Assignment Mutation
  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrainerId) {
        throw new Error('Please select a trainer to assign.');
      }

      if (isDatabaseOpen()) {
        return await localMutationService.assignTrainer({
          memberId,
          trainerId: selectedTrainerId,
          notes: notes.trim() || undefined,
        });
      }

      return await OwnerTrainersService.assignTrainer(memberId, {
        trainerId: selectedTrainerId,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-trainer-history', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-trainers'] });
      queryClient.invalidateQueries({ queryKey: ['owner-pt-dashboard'] });
      Alert.alert(
        'Trainer Assigned',
        `${selectedTrainer?.fullName || 'Coach'} has been assigned to ${memberName} locally (Pending sync).`
      );
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to assign trainer. Please try again.'
      );
    },
  });

  const isFormValid = !!selectedTrainerId && !assignMutation.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Assign Personal Trainer"
      subtitle={`Dedicated coach assignment for ${memberName}`}
      maxHeightRatio={0.88}
      footer={
        <View style={styles.footerRow}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <SecondaryButton
              label="Cancel"
              onPress={onClose}
              disabled={assignMutation.isPending}
              size="md"
            />
          </View>
          <View style={{ flex: 1.6 }}>
            <PrimaryButton
              label="Confirm Assignment"
              icon={<UserCheck size={18} color={colors.textOnPrimary} />}
              onPress={() => assignMutation.mutate()}
              disabled={!isFormValid}
              loading={assignMutation.isPending}
              size="md"
              accessibilityLabel="Confirm coach assignment"
            />
          </View>
        </View>
      }
    >
      <View style={styles.content}>
        {/* Error Banner */}
        {errorMessage && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder, borderRadius: radii.sm },
            ]}
          >
            <AlertCircle size={16} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={[typography.captionBold, { color: colors.dangerText, flex: 1 }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        {/* Member Context Card */}
        <View
          style={[
            styles.contextCard,
            { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, borderRadius: radii.md },
          ]}
        >
          <View
            style={[
              styles.memberIconCircle,
              { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
            ]}
          >
            <User size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
              {memberName}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {currentTrainer
                ? `Currently assigned to ${currentTrainer.fullName}`
                : 'No dedicated trainer assigned currently'}
            </Text>
          </View>
        </View>

        {/* Notice if replacing existing coach */}
        {currentTrainerId && selectedTrainerId && selectedTrainerId !== currentTrainerId && (
          <View
            style={[
              styles.reassignNotice,
              { backgroundColor: colors.warningBg, borderColor: colors.warningBorder, borderRadius: radii.sm },
            ]}
          >
            <Sparkles size={14} color={colors.warning} style={{ marginRight: 6 }} />
            <Text style={[typography.captionBold, { color: colors.warningText, flex: 1 }]}>
              This will transition active coaching from {currentTrainer?.fullName || 'previous coach'} to {selectedTrainer?.fullName}.
            </Text>
          </View>
        )}

        {/* Trainer Search Box */}
        {(trainers || []).length > 3 && (
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
            <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, typography.body, { color: colors.textPrimary }]}
              placeholder="Search trainer by name or specialty..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Trainer Options List */}
        <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 8, marginTop: 4 }]}>
          SELECT CERTIFIED TRAINER *
        </Text>

        {isTrainersLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>
              Loading available trainers...
            </Text>
          </View>
        ) : filteredTrainers.length > 0 ? (
          <View style={styles.trainersList}>
            {filteredTrainers.map((t: TrainerSummary) => {
              const isSelected = selectedTrainerId === t.id;
              const isCurrent = t.id === currentTrainerId;

              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.trainerOption,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radii.md,
                    },
                  ]}
                  onPress={() => {
                    setSelectedTrainerId(t.id);
                    setErrorMessage(null);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`Select trainer ${t.fullName}`}
                >
                  {/* Trainer Avatar */}
                  <View
                    style={[
                      styles.trainerAvatar,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        borderRadius: radii.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.cardTitle,
                        { color: isSelected ? colors.textOnPrimary : colors.textPrimary },
                      ]}
                    >
                      {(t.fullName || 'T').charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Trainer Details */}
                  <View style={styles.trainerInfo}>
                    <View style={styles.trainerNameRow}>
                      <Text
                        style={[
                          typography.cardTitle,
                          { color: isSelected ? colors.primary : colors.textPrimary },
                        ]}
                      >
                        {t.fullName}
                      </Text>
                      {isCurrent && (
                        <View
                          style={[
                            styles.currentBadge,
                            { backgroundColor: colors.infoBg, borderColor: colors.infoBorder },
                          ]}
                        >
                          <Text style={[typography.captionBold, { color: colors.info, fontSize: 10 }]}>
                            Current Coach
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      {t.specialization || 'General Fitness & Conditioning'}
                    </Text>

                    <View style={styles.metaRow}>
                      {t.rating && (
                        <View style={styles.ratingBadge}>
                          <Star size={11} color={colors.warning} fill={colors.warning} style={{ marginRight: 3 }} />
                          <Text style={[typography.captionBold, { color: colors.textPrimary, fontSize: 11 }]}>
                            {t.rating}
                          </Text>
                        </View>
                      )}
                      {t.experienceYears ? (
                        <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
                          • {t.experienceYears} yrs exp
                        </Text>
                      ) : null}
                      {t.activeClientsCount !== undefined ? (
                        <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8 }]}>
                          • {t.activeClientsCount} clients
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Radio Indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? colors.primary : colors.borderStrong,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        borderRadius: radii.full,
                      },
                    ]}
                  >
                    {isSelected && <Check size={12} color={colors.textOnPrimary} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, borderRadius: radii.md },
            ]}
          >
            <Dumbbell size={28} color={colors.textSecondary} style={{ marginBottom: 8 }} />
            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
              {searchQuery ? 'No trainers match your search' : 'No active trainers found'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
              {searchQuery
                ? 'Try searching with a different name or specialization.'
                : 'Add personal trainers in the Trainers tab before making assignments.'}
            </Text>
          </View>
        )}

        {/* Coaching Notes & Objectives */}
        <View style={styles.notesSection}>
          <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
            COACHING OBJECTIVES & NOTES (OPTIONAL)
          </Text>
          <View
            style={[
              styles.textAreaWrapper,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.md,
              },
            ]}
          >
            <FileText size={16} color={colors.textMuted} style={styles.textAreaIcon} />
            <TextInput
              style={[
                styles.textArea,
                typography.body,
                { color: colors.textPrimary },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Strength building, knee injury rehab, dietary goals, session target..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  memberIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reassignNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  trainersList: {
    gap: 8,
  },
  trainerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1.5,
  },
  trainerAvatar: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trainerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  centerLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyBox: {
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  notesSection: {
    marginTop: 16,
  },
  textAreaWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 74,
  },
  textAreaIcon: {
    marginTop: 3,
    marginRight: 8,
  },
  textArea: {
    flex: 1,
    padding: 0,
    minHeight: 54,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
