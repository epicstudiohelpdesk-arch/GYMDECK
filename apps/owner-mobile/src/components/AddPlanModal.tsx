/**
 * GymDeck Owner Mobile - Add Membership Plan Modal
 *
 * Sourced directly from local database with transactional outbox.
 * Price is entered in Rupees and converted strictly to integer paise.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { BottomSheet } from './ui/BottomSheet';
import { useTheme } from '../theme';
import { Layers, Check, AlertCircle } from 'lucide-react-native';

interface AddPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPlanModal: React.FC<AddPlanModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, typography, radii, shadows } = useTheme();
  const queryClient = useQueryClient();

  const [planName, setPlanName] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [priceRupees, setPriceRupees] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPlanName('');
      setDurationDays('30');
      setPriceRupees('');
      setDescription('');
      setBenefits('');
      setErrorMessage(null);
    }
  }, [visible]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!planName.trim() || planName.trim().length < 2) {
        throw new Error('Plan name is required (minimum 2 characters).');
      }
      const days = parseInt(durationDays, 10);
      if (isNaN(days) || days < 1) {
        throw new Error('Duration must be at least 1 day.');
      }
      const priceNum = parseFloat(priceRupees);
      if (isNaN(priceNum) || priceNum < 0) {
        throw new Error('Please enter a valid non-negative price.');
      }

      const priceMinorUnits = Math.round(priceNum * 100);

      if (isDatabaseOpen()) {
        return await localMutationService.createPlan({
          planName: planName.trim(),
          durationDays: days,
          priceMinorUnits,
          description: description.trim() || undefined,
          benefits: benefits.trim() || undefined,
          isActive: true,
        });
      }

      throw new Error('Database is not initialized for offline plan creation.');
    },
    onSuccess: () => {
      Alert.alert('Plan Created', 'Membership plan successfully created locally (Pending sync).');
      queryClient.invalidateQueries({ queryKey: ['local-plans'] });
      queryClient.invalidateQueries({ queryKey: ['owner-plans'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to create membership plan.');
    },
  });

  const isFormValid = planName.trim().length >= 2 && Number(durationDays) > 0 && priceRupees.trim().length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Create Membership Plan"
      subtitle="Define subscription tier, duration, and price"
      maxHeightRatio={0.9}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder, borderRadius: radii.sm },
              ]}
            >
              <AlertCircle size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={[typography.captionBold, { color: colors.dangerText, flex: 1 }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Plan Name */}
          <Text style={[typography.formLabel, { color: colors.textSecondary }]}>PLAN NAME *</Text>
          <TextInput
            value={planName}
            onChangeText={(text) => {
              setPlanName(text);
              setErrorMessage(null);
            }}
            placeholder="e.g. Quarterly Gold Membership"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              typography.inputText,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                borderRadius: radii.md,
              },
            ]}
          />

          {/* Duration in Days */}
          <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            DURATION (DAYS) *
          </Text>
          <View style={styles.presetsRow}>
            {[
              { label: '1 Mo (30d)', days: '30' },
              { label: '3 Mo (90d)', days: '90' },
              { label: '6 Mo (180d)', days: '180' },
              { label: '1 Yr (365d)', days: '365' },
            ].map((preset) => (
              <TouchableOpacity
                key={preset.days}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: durationDays === preset.days ? colors.primary : colors.surfaceSubtle,
                    borderColor: durationDays === preset.days ? colors.primary : colors.borderSubtle,
                    borderRadius: radii.full,
                  },
                ]}
                onPress={() => setDurationDays(preset.days)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    typography.captionBold,
                    {
                      color: durationDays === preset.days ? colors.textOnPrimary : colors.textPrimary,
                    },
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={durationDays}
            onChangeText={setDurationDays}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              typography.inputText,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                borderRadius: radii.md,
                marginTop: 6,
              },
            ]}
          />

          {/* Price in Rupees */}
          <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            PRICE (₹ RUPEES) *
          </Text>
          <TextInput
            value={priceRupees}
            onChangeText={(text) => {
              setPriceRupees(text);
              setErrorMessage(null);
            }}
            keyboardType="decimal-pad"
            placeholder="e.g. 1999.00"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              typography.inputText,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                borderRadius: radii.md,
              },
            ]}
          />
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            Persisted strictly as integer paise ({priceRupees ? `${Math.round(Number(priceRupees) * 100)} paise` : '0 paise'})
          </Text>

          {/* Description */}
          <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            DESCRIPTION (OPTIONAL)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Brief plan overview..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              typography.inputText,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                borderRadius: radii.md,
              },
            ]}
          />

          {/* Benefits */}
          <Text style={[typography.formLabel, { color: colors.textSecondary, marginTop: 14 }]}>
            BENEFITS / INCLUSIONS (OPTIONAL)
          </Text>
          <TextInput
            value={benefits}
            onChangeText={setBenefits}
            placeholder="e.g. Full Gym Access, Locker, Steam Room"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              typography.inputText,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.borderSubtle,
                color: colors.textPrimary,
                borderRadius: radii.md,
              },
            ]}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: isFormValid ? colors.primary : colors.surfaceSubtle,
                borderColor: isFormValid ? colors.primary : colors.borderSubtle,
                borderRadius: radii.md,
              },
            ]}
            onPress={() => createMutation.mutate()}
            disabled={!isFormValid || createMutation.isPending}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <Text style={[typography.button, { color: colors.textOnPrimary }]}>Saving Locally...</Text>
            ) : (
              <View style={styles.btnRow}>
                <Check size={16} color={isFormValid ? colors.textOnPrimary : colors.textMuted} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    typography.button,
                    { color: isFormValid ? colors.textOnPrimary : colors.textMuted },
                  ]}
                >
                  Create Plan Locally
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  submitBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    borderWidth: 1,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
