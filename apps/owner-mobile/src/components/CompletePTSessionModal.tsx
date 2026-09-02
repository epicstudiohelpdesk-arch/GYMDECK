/**
 * GymDeck Owner Mobile - Complete / Log PT Session Modal
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
import { OwnerTrainersService } from '../services/api/ownerTrainersService';
import { CheckCircle2, X, Check, Dumbbell } from 'lucide-react-native';

interface CompletePTSessionModalProps {
  visible: boolean;
  packageId: string;
  packageName: string;
  remainingSessions: number;
  trainerName: string;
  memberId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CompletePTSessionModal: React.FC<CompletePTSessionModalProps> = ({
  visible,
  packageId,
  packageName,
  remainingSessions,
  trainerName,
  memberId,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [focusArea, setFocusArea] = useState('Strength & Hypertrophy');
  const [trainerNotes, setTrainerNotes] = useState('');

  const completeMutation = useMutation({
    mutationFn: async () => {
      return await OwnerTrainersService.completePTSession(packageId, {
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        focusArea: focusArea.trim() || 'General Fitness',
        trainerNotes: trainerNotes.trim() || undefined,
      });
    },
    onSuccess: (data: any) => {
      Alert.alert(
        'Session Logged',
        `1 session deducted. ${data.packageRemainingSessions} sessions remaining in package.`
      );
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-member-pt-packages', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-trainers'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      Alert.alert(
        'Action Failed',
        err?.response?.data?.message || err.message || 'Failed to complete session.'
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
              <CheckCircle2 size={22} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Complete PT Session</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Log completed session for {packageName} with {trainerName}
          </Text>

          <View style={styles.badgeBox}>
            <Text style={styles.badgeLabel}>AVAILABLE SESSIONS</Text>
            <Text style={styles.badgeVal}>{remainingSessions} Sessions Remaining</Text>
          </View>

          <Text style={[styles.label, { marginTop: 14 }]}>FOCUS AREA / WORKOUT TYPE</Text>
          <TextInput
            style={styles.input}
            value={focusArea}
            onChangeText={setFocusArea}
            placeholder="e.g. Back & Biceps / Lower Body Power"
            placeholderTextColor="#64748B"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>DURATION (MINUTES)</Text>
          <TextInput
            style={styles.input}
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            keyboardType="numeric"
            placeholder="60"
            placeholderTextColor="#64748B"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>TRAINER NOTES / PRs (OPTIONAL)</Text>
          <TextInput
            style={styles.textArea}
            value={trainerNotes}
            onChangeText={setTrainerNotes}
            placeholder="e.g. 5x5 Squats @ 140kg, improved knee stability"
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={3}
          />

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                completeMutation.isPending && styles.submitBtnDisabled,
              ]}
              onPress={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              activeOpacity={0.8}
            >
              {completeMutation.isPending ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  <Check size={18} color="#000000" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Deduct 1 Session</Text>
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
    marginBottom: 12,
  },
  badgeBox: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 2,
  },
  badgeVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
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
  textArea: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    textAlignVertical: 'top',
    height: 70,
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
    backgroundColor: '#10B981',
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
