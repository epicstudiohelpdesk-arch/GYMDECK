/**
 * GymDeck Owner Mobile - Assign Personal Trainer Modal
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
import { TrainerSummary } from '../types';
import { Award, X, Check, UserCheck, Shield } from 'lucide-react-native';

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
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>(currentTrainerId || '');
  const [notes, setNotes] = useState('');

  const { data: trainers, isLoading: isTrainersLoading } = useQuery({
    queryKey: ['owner-trainers-list'],
    queryFn: () => OwnerTrainersService.getTrainers(false),
    enabled: visible,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrainerId) {
        throw new Error('Please select a trainer to assign.');
      }
      return await OwnerTrainersService.assignTrainer(memberId, {
        trainerId: selectedTrainerId,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert('Trainer Assigned', 'The trainer has been successfully assigned to the member.');
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-trainer-history', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-trainers'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      Alert.alert(
        'Assignment Failed',
        err?.response?.data?.message || err.message || 'Failed to assign trainer. Please try again.'
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
              <Award size={22} color="#EAB308" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Assign Personal Trainer</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Assign a certified trainer to {memberName}</Text>

          {isTrainersLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#EAB308" size="large" />
              <Text style={styles.loadingText}>Loading available trainers...</Text>
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>SELECT TRAINER</Text>
              {trainers && trainers.length > 0 ? (
                trainers.map((t: TrainerSummary) => {
                  const isSelected = selectedTrainerId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.trainerOption, isSelected && styles.trainerOptionSelected]}
                      onPress={() => setSelectedTrainerId(t.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.trainerInfo}>
                        <Text style={styles.trainerName}>{t.fullName}</Text>
                        <Text style={styles.trainerSpec}>
                          {t.specialization || 'Fitness & Conditioning'} • ⭐ {t.rating || '5.0'}
                        </Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No active trainers found in gym.</Text>
                </View>
              )}

              <Text style={[styles.label, { marginTop: 16 }]}>TRAINING NOTES / GOALS (OPTIONAL)</Text>
              <TextInput
                style={styles.textArea}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Strength building, knee injury rehab, dietary goals..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
              />
            </ScrollView>
          )}

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedTrainerId || assignMutation.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={() => assignMutation.mutate()}
              disabled={!selectedTrainerId || assignMutation.isPending}
              activeOpacity={0.8}
            >
              {assignMutation.isPending ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  <UserCheck size={18} color="#000000" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Confirm Assignment</Text>
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
    maxHeight: '85%',
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
    maxHeight: 360,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  trainerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  trainerOptionSelected: {
    borderColor: '#EAB308',
    backgroundColor: '#2A2410',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  trainerSpec: {
    fontSize: 12,
    color: '#94A3B8',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioCircleSelected: {
    borderColor: '#EAB308',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EAB308',
  },
  emptyBox: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  textArea: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    textAlignVertical: 'top',
    height: 80,
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
