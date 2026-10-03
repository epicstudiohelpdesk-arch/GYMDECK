/**
 * GymDeck Owner Mobile - Purchase PT Package Modal
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
import { OwnerTrainersService } from '../services/api/ownerTrainersService';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { TrainerSummary } from '../types';
import { Award, X, Check, DollarSign, Dumbbell } from 'lucide-react-native';

interface PurchasePTPackageModalProps {
  visible: boolean;
  memberId: string;
  memberName: string;
  defaultTrainerId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchasePTPackageModal: React.FC<PurchasePTPackageModalProps> = ({
  visible,
  memberId,
  memberName,
  defaultTrainerId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(defaultTrainerId || '');
  const [packageName, setPackageName] = useState('10 Sessions Personal Training');
  const [totalSessions, setTotalSessions] = useState('10');
  const [price, setPrice] = useState('600.00');
  const [expiryDays, setExpiryDays] = useState('90');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER'>('CARD');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');

  const { data: trainers, isLoading: isTrainersLoading } = useQuery({
    queryKey: ['owner-trainers-list'],
    queryFn: () => OwnerTrainersService.getTrainers(false),
    enabled: visible,
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrainerId) {
        throw new Error('Please select a trainer for this package.');
      }
      const numSessions = parseInt(totalSessions, 10);
      if (isNaN(numSessions) || numSessions < 1) {
        throw new Error('Total sessions must be at least 1.');
      }
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice < 0) {
        throw new Error('Please enter a valid non-negative price.');
      }

      if (isDatabaseOpen()) {
        return await localMutationService.purchasePTPackage({
          memberId,
          trainerId: selectedTrainerId,
          packageName: packageName.trim(),
          totalSessions: numSessions,
          price: numPrice,
          expiryDays: parseInt(expiryDays, 10) || 90,
          paymentMethod,
          transactionReference: transactionRef.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }

      return await OwnerTrainersService.purchasePTPackage(memberId, {
        trainerId: selectedTrainerId,
        packageName: packageName.trim(),
        totalSessions: numSessions,
        price: numPrice,
        expiryDays: parseInt(expiryDays, 10) || 90,
        paymentMethod,
        transactionReference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert('PT Package Purchased', 'Personal training package allocated locally (Pending sync).');
      queryClient.invalidateQueries({ queryKey: ['local-pt-packages', memberId] });
      queryClient.invalidateQueries({ queryKey: ['local-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-pt-packages', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-billing', memberId] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      Alert.alert(
        'Purchase Failed',
        err?.response?.data?.message || err.message || 'Failed to purchase PT package.'
      );
    },
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Dumbbell size={22} color="#EAB308" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Purchase PT Package</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Allocate training sessions for {memberName}</Text>

          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            <Text style={styles.label}>ASSIGNED TRAINER</Text>
            {isTrainersLoading ? (
              <ActivityIndicator color="#EAB308" size="small" />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                style={styles.trainerScroll}
              >
                {trainers?.map((t: TrainerSummary) => {
                  const isSelected = selectedTrainerId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.trainerChip, isSelected && styles.trainerChipSelected]}
                      onPress={() => setSelectedTrainerId(t.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.trainerChipText, isSelected && styles.trainerChipTextSelected]}>
                        {t.fullName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <Text style={[styles.label, { marginTop: 14 }]}>PACKAGE NAME</Text>
            <TextInput
              style={styles.input}
              value={packageName}
              onChangeText={setPackageName}
              placeholder="e.g. 10 Sessions Performance Pack"
              placeholderTextColor="#64748B"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { marginTop: 14 }]}>TOTAL SESSIONS</Text>
                <TextInput
                  style={styles.input}
                  value={totalSessions}
                  onChangeText={setTotalSessions}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { marginTop: 14 }]}>PRICE ($)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="600.00"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>VALIDITY (DAYS)</Text>
            <TextInput
              style={styles.input}
              value={expiryDays}
              onChangeText={setExpiryDays}
              keyboardType="numeric"
              placeholder="90"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>PAYMENT METHOD</Text>
            <View style={styles.methodRow}>
              {(['CARD', 'UPI', 'CASH', 'BANK_TRANSFER'] as const).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    style={[styles.methodBtn, isSelected && styles.methodBtnSelected]}
                    onPress={() => setPaymentMethod(method)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.methodText, isSelected && styles.methodTextSelected]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>TRANSACTION REFERENCE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={transactionRef}
              onChangeText={setTransactionRef}
              placeholder="e.g. TXN-998822"
              placeholderTextColor="#64748B"
            />
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedTrainerId || purchaseMutation.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={() => purchaseMutation.mutate()}
              disabled={!selectedTrainerId || purchaseMutation.isPending}
              activeOpacity={0.8}
            >
              {purchaseMutation.isPending ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  <Check size={18} color="#000000" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Confirm Purchase</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  body: {
    maxHeight: 420,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  trainerScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  trainerChip: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  trainerChipSelected: {
    backgroundColor: '#EAB308',
    borderColor: '#EAB308',
  },
  trainerChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  trainerChipTextSelected: {
    color: '#000000',
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodBtn: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  methodBtnSelected: {
    borderColor: '#EAB308',
    backgroundColor: '#2A2410',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  methodTextSelected: {
    color: '#EAB308',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#334155',
  },
  cancelBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#EAB308',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});
