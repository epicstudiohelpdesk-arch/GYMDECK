/**
 * GymDeck Owner Mobile - Renew Membership Subscription Modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerBillingService } from '../services/api/ownerBillingService';
import { Award, X, Check, RefreshCw } from 'lucide-react-native';

interface RenewMembershipModalProps {
  visible: boolean;
  memberId: string;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  visible,
  memberId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');

  // Fetch available plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['owner-plans'],
    queryFn: () => OwnerBillingService.getPlans(),
    enabled: visible,
  });

  const renewMutation = useMutation({
    mutationFn: () => {
      if (!selectedPlanId) throw new Error('Please select a plan');
      return OwnerBillingService.renewMembership(memberId, {
        planId: selectedPlanId,
        paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
        paymentMethod,
        notes: notes.trim() || undefined,
        idempotencyKey: `RENEW-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-billing', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      Alert.alert('Membership Renewed', 'Subscription extended successfully.');
      onSuccess(result);
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Renewal Failed', err?.message || 'Unable to renew membership.');
    },
  });

  const handlePlanSelect = (plan: any) => {
    setSelectedPlanId(plan.id);
    setPaymentAmount(plan.price.toString());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Award size={22} color="#EAB308" style={{ marginRight: 6 }} />
              <Text style={styles.title}>Renew Membership</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.sectionHeader}>Select Renewal Plan</Text>

            {plansLoading ? (
              <ActivityIndicator color="#EAB308" />
            ) : (
              <View style={styles.plansList}>
                {(plans || []).map((p) => {
                  const isSelected = selectedPlanId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.planCard, isSelected && styles.planCardSelected]}
                      onPress={() => handlePlanSelect(p)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planName, isSelected && { color: '#EAB308' }]}>
                          {p.planName}
                        </Text>
                        <Text style={styles.planDuration}>{p.durationDays} Days</Text>
                      </View>
                      <Text style={styles.planPrice}>${p.price}</Text>
                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Check size={14} color="#0A0D14" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {selectedPlanId && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionHeader}>Payment Details</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Payment Amount ($)</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Payment Method</Text>
                  <View style={styles.methodsRow}>
                    {(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const).map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.methodChip, paymentMethod === m && styles.methodChipSelected]}
                        onPress={() => setPaymentMethod(m)}
                      >
                        <Text
                          style={[
                            styles.methodText,
                            paymentMethod === m && styles.methodTextSelected,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Renewal notes..."
                    placeholderTextColor="#64748B"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!selectedPlanId || renewMutation.isPending) && styles.submitBtnDisabled,
            ]}
            onPress={() => renewMutation.mutate()}
            disabled={!selectedPlanId || renewMutation.isPending}
            activeOpacity={0.8}
          >
            {renewMutation.isPending ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <>
                <RefreshCw size={18} color="#0A0D14" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Confirm Renewal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#131823',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  content: {
    paddingBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 10,
    marginTop: 6,
  },
  plansList: {
    gap: 8,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
  },
  planCardSelected: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  planDuration: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10B981',
    marginRight: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#EAB308',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    color: '#EAB308',
    fontSize: 18,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#F8FAFC',
    fontSize: 14,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  methodChip: {
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  methodChipSelected: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#EAB308',
  },
  methodText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  methodTextSelected: {
    color: '#EAB308',
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 12,
    height: 48,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#0A0D14',
    fontSize: 15,
    fontWeight: '700',
  },
});
