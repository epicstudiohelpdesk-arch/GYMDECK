/**
 * GymDeck Owner Mobile - Collect Payment / Record Dues Modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerBillingService } from '../services/api/ownerBillingService';
import { DollarSign, X, Check } from 'lucide-react-native';

interface CollectPaymentModalProps {
  visible: boolean;
  memberId: string;
  defaultAmount?: number;
  onClose: () => void;
  onSuccess: (payment: any) => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  visible,
  memberId,
  defaultAmount,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(defaultAmount ? defaultAmount.toString() : '');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  const paymentMutation = useMutation({
    mutationFn: () =>
      OwnerBillingService.recordPayment(memberId, {
        amount: Number(amount),
        paymentMethod,
        transactionReference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: `APP-PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      }),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-billing', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      Alert.alert('Payment Recorded', `Successfully collected $${Number(payment.amount).toFixed(2)}.`);
      onSuccess(payment);
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Payment Failed', err?.message || 'Unable to record payment.');
    },
  });

  const handleCollect = () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount greater than 0.');
      return;
    }
    paymentMutation.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <DollarSign size={22} color="#EAB308" style={{ marginRight: 6 }} />
              <Text style={styles.title}>Collect Payment</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount ($)</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              value={amount}
              onChangeText={setAmount}
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
            <Text style={styles.label}>Transaction / Reference # (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="UPI Ref, Card Auth Code..."
              placeholderTextColor="#64748B"
              value={transactionRef}
              onChangeText={setTransactionRef}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Partial payment for annual dues"
              placeholderTextColor="#64748B"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, paymentMutation.isPending && styles.submitBtnDisabled]}
            onPress={handleCollect}
            disabled={paymentMutation.isPending}
            activeOpacity={0.8}
          >
            {paymentMutation.isPending ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <>
                <Check size={18} color="#0A0D14" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Confirm Payment</Text>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  inputGroup: {
    marginBottom: 14,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    color: '#EAB308',
    fontSize: 22,
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
    paddingVertical: 8,
    borderRadius: 8,
  },
  methodChipSelected: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#EAB308',
  },
  methodText: {
    color: '#94A3B8',
    fontSize: 12,
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
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#0A0D14',
    fontSize: 15,
    fontWeight: '700',
  },
});
