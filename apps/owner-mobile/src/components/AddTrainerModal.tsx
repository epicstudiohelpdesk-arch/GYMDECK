/**
 * GymDeck Owner Mobile - Add / Register Personal Trainer Modal
 *
 * Replaces dark floating modal with canonical BottomSheet primitive:
 * Light theme tokens, accessible inputs (>= 44pt), keyboard safe, and real backend mutation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerTrainersService } from '../services/api/ownerTrainersService';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { BottomSheet } from './ui/BottomSheet';
import { useTheme } from '../theme';
import { Award, Check, UserPlus, AlertCircle } from 'lucide-react-native';

interface AddTrainerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddTrainerModal: React.FC<AddTrainerModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, typography, radii, shadows } = useTheme();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('Strength & Conditioning');
  const [experienceYears, setExperienceYears] = useState('3');
  const [commissionType, setCommissionType] = useState<'FIXED_PER_SESSION' | 'PERCENTAGE'>('FIXED_PER_SESSION');
  const [commissionRate, setCommissionRate] = useState('500');
  const [bio, setBio] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFullName('');
      setPhone('');
      setEmail('');
      setSpecialization('Strength & Conditioning');
      setExperienceYears('3');
      setCommissionType('FIXED_PER_SESSION');
      setCommissionRate('500');
      setBio('');
      setErrorMessage(null);
    }
  }, [visible]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || fullName.trim().length < 2) {
        throw new Error('Full name is required (minimum 2 characters).');
      }
      if (!phone.trim() || phone.trim().length < 7) {
        throw new Error('Valid contact phone number is required.');
      }

      if (isDatabaseOpen()) {
        return await localMutationService.createTrainer({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          specialization: specialization.trim() || undefined,
          experienceYears: parseInt(experienceYears, 10) || 1,
          bio: bio.trim() || undefined,
          isActive: true,
        });
      }

      return await OwnerTrainersService.createTrainer({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        specialization: specialization.trim() || undefined,
        experienceYears: parseInt(experienceYears, 10) || 1,
        commissionType,
        commissionRate: parseFloat(commissionRate) || 0,
        bio: bio.trim() || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert('Coach Registered', 'Personal trainer successfully added locally (Pending sync).');
      queryClient.invalidateQueries({ queryKey: ['local-trainers'] });
      queryClient.invalidateQueries({ queryKey: ['owner-trainers'] });
      queryClient.invalidateQueries({ queryKey: ['owner-trainers-list'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to register trainer.'
      );
    },
  });

  const isFormValid = fullName.trim().length >= 2 && phone.trim().length >= 7;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Register Coach / Trainer"
      subtitle="Add certified coaching staff to gym profile"
      maxHeightRatio={0.9}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
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

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
              FULL NAME *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                },
              ]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Alexander Cole"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
              PHONE NUMBER *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                },
              ]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
              EMAIL ADDRESS (OPTIONAL)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="e.g. alex@gymdeck.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          {/* Specialization & Experience */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                SPECIALIZATION
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    color: colors.textPrimary,
                  },
                ]}
                value={specialization}
                onChangeText={setSpecialization}
                placeholder="e.g. Powerlifting"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={{ width: 100, marginLeft: 8 }}>
              <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                EXP (YRS)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    color: colors.textPrimary,
                  },
                ]}
                value={experienceYears}
                onChangeText={setExperienceYears}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Commission Type Selector */}
          <View style={styles.inputGroup}>
            <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
              COMMISSION MODEL
            </Text>
            <View style={styles.commTypeRow}>
              <TouchableOpacity
                style={[
                  styles.commBtn,
                  {
                    backgroundColor: commissionType === 'FIXED_PER_SESSION' ? colors.primarySoft : colors.surface,
                    borderColor: commissionType === 'FIXED_PER_SESSION' ? colors.primary : colors.border,
                    borderRadius: radii.md,
                  },
                ]}
                onPress={() => setCommissionType('FIXED_PER_SESSION')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.captionBold,
                    { color: commissionType === 'FIXED_PER_SESSION' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Fixed / Session (₹)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.commBtn,
                  {
                    backgroundColor: commissionType === 'PERCENTAGE' ? colors.primarySoft : colors.surface,
                    borderColor: commissionType === 'PERCENTAGE' ? colors.primary : colors.border,
                    borderRadius: radii.md,
                  },
                ]}
                onPress={() => setCommissionType('PERCENTAGE')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.captionBold,
                    { color: commissionType === 'PERCENTAGE' ? colors.primary : colors.textPrimary },
                  ]}
                >
                  Percentage (%)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Commission Rate */}
          <View style={styles.inputGroup}>
            <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
              COMMISSION RATE {commissionType === 'PERCENTAGE' ? '(%)' : '(₹)'}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                },
              ]}
              value={commissionRate}
              onChangeText={setCommissionRate}
              keyboardType="decimal-pad"
              placeholder={commissionType === 'PERCENTAGE' ? '30' : '500'}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Bio / Summary */}
          <View style={styles.inputGroup}>
            <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
              BIO / SUMMARY (OPTIONAL)
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                },
              ]}
              value={bio}
              onChangeText={setBio}
              placeholder="e.g. Certified strength coach specializing in hypertrophy & mobility..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[typography.button, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isFormValid ? colors.primary : colors.surfaceSubtle,
                  borderColor: isFormValid ? colors.primary : colors.border,
                  borderRadius: radii.md,
                },
              ]}
              onPress={() => createMutation.mutate()}
              disabled={!isFormValid || createMutation.isPending}
              activeOpacity={0.8}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <>
                  <Check size={18} color={isFormValid ? colors.textOnPrimary : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      typography.button,
                      { color: isFormValid ? colors.textOnPrimary : colors.textMuted },
                    ]}
                  >
                    Register Coach
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  input: {
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  commTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 44,
  },
  textArea: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 14,
    textAlignVertical: 'top',
    height: 74,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
  },
});
