/**
 * GymDeck Owner Mobile - Renew Membership Subscription Modal
 *
 * Provides renewal selection with canonical Phase 02 BottomSheet:
 * Plan picker, contractual price, payment method, audit notes, and instant cache invalidation.
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
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerBillingService } from '../services/api/ownerBillingService';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { BottomSheet } from './ui/BottomSheet';
import { useTheme } from '../theme';
import { formatCurrency } from '../utils/currency';
import { Award, Check, RefreshCw, AlertCircle } from 'lucide-react-native';

interface RenewMembershipModalProps {
  visible: boolean;
  memberId: string;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const;

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  visible,
  memberId,
  onClose,
  onSuccess,
}) => {
  const { colors, typography, radii } = useTheme();
  const queryClient = useQueryClient();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['owner-plans'],
    queryFn: () => OwnerBillingService.getPlans(),
    enabled: visible,
  });

  useEffect(() => {
    if (visible) {
      setSelectedPlanId(null);
      setPaymentAmount('');
      setPaymentMethod('CASH');
      setNotes('');
      setErrorMsg(null);
    }
  }, [visible]);

  const renewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlanId) throw new Error('Please select a membership plan.');

      if (isDatabaseOpen()) {
        return localMutationService.renewMembership({
          memberId,
          planId: selectedPlanId,
          paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
          paymentMethod,
          notes: notes.trim() || undefined,
        });
      }

      return OwnerBillingService.renewMembership(memberId, {
        planId: selectedPlanId,
        paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        idempotencyKey: `RENEW-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['local-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-billing', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-financial-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics-overview'] });
      Alert.alert('Membership Renewed', 'Subscription extended locally (Pending sync).');
      onSuccess(result);
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || 'Unable to renew membership.');
    },
  });

  const handlePlanSelect = (plan: any) => {
    setSelectedPlanId(plan.id);
    setPaymentAmount(plan.price.toString());
    setErrorMsg(null);
  };

  const selectedPlan = (plans || []).find((p: any) => p.id === selectedPlanId);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Renew Membership"
      maxHeightRatio={0.85}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {errorMsg && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder, borderRadius: radii.sm },
            ]}
          >
            <AlertCircle size={16} color={colors.danger} style={{ marginRight: 6 }} />
            <Text style={[typography.captionBold, { color: colors.dangerText, flex: 1 }]}>
              {errorMsg}
            </Text>
          </View>
        )}

        <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
          SELECT RENEWAL PLAN *
        </Text>

        {plansLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>
              Loading plans...
            </Text>
          </View>
        ) : (
          <View style={styles.plansList}>
            {(plans || []).map((p: any) => {
              const isSelected = selectedPlanId === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radii.md,
                    },
                  ]}
                  onPress={() => handlePlanSelect(p)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${p.planName}, ${formatCurrency(p.price)}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        typography.cardTitle,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {p.planName}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      {p.durationDays} Days validity
                    </Text>
                  </View>

                  <Text
                    style={[
                      typography.sectionTitle,
                      { color: isSelected ? colors.primary : colors.textPrimary, marginRight: 8 },
                    ]}
                  >
                    {formatCurrency(p.price)}
                  </Text>

                  {isSelected && (
                    <View
                      style={[
                        styles.checkCircle,
                        { backgroundColor: colors.primary, borderRadius: radii.full },
                      ]}
                    >
                      <Check size={12} color={colors.textOnPrimary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selectedPlan && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.inputGroup}>
              <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                COLLECTION AMOUNT (₹)
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
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                PAYMENT METHOD
              </Text>
              <View style={styles.methodsRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodChip,
                      {
                        backgroundColor: paymentMethod === m ? colors.primarySoft : colors.surface,
                        borderColor: paymentMethod === m ? colors.primary : colors.border,
                        borderRadius: radii.sm,
                      },
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        { color: paymentMethod === m ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                AUDIT NOTES (OPTIONAL)
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
                placeholder="Renewal notes..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: selectedPlanId ? colors.primary : colors.surfaceSubtle,
              borderColor: selectedPlanId ? colors.primary : colors.border,
              borderRadius: radii.md,
            },
          ]}
          onPress={() => renewMutation.mutate()}
          disabled={!selectedPlanId || renewMutation.isPending}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Confirm membership renewal"
        >
          {renewMutation.isPending ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <RefreshCw size={16} color={selectedPlanId ? colors.textOnPrimary : colors.textMuted} style={{ marginRight: 6 }} />
              <Text
                style={[
                  typography.button,
                  { color: selectedPlanId ? colors.textOnPrimary : colors.textMuted },
                ]}
              >
                Confirm Renewal
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
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
  centerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  plansList: {
    gap: 8,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  checkCircle: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  input: {
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    marginTop: 12,
  },
});
