/**
 * GymDeck Owner Mobile - Manual Attendance Entry Modal
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
import { OwnerAttendanceService } from '../services/api/ownerAttendanceService';
import { FileEdit, X, Check } from 'lucide-react-native';

interface ManualAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [memberCode, setMemberCode] = useState('');
  const [notes, setNotes] = useState('');

  const manualMutation = useMutation({
    mutationFn: () => {
      const cleanCode = memberCode.trim().toUpperCase();
      if (!cleanCode) throw new Error('Please enter Member Code');
      if (!notes.trim() || notes.trim().length < 3) {
        throw new Error('Please enter a valid reason / notes (minimum 3 characters)');
      }
      return OwnerAttendanceService.recordManualAttendance({
        memberCode: cleanCode,
        checkInTime: new Date().toISOString(),
        notes: notes.trim(),
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      Alert.alert(
        'Manual Attendance Logged',
        `Recorded manual entry for ${res.fullName} (${res.memberCode}).`
      );
      setMemberCode('');
      setNotes('');
      onSuccess(res);
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Manual Entry Failed', err?.message || 'Unable to record manual attendance.');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <FileEdit size={22} color="#EAB308" style={{ marginRight: 6 }} />
              <Text style={styles.title}>Manual Attendance Entry</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Log an attendance session manually with mandatory audit notes.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Member Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. GD-1001"
              placeholderTextColor="#64748B"
              value={memberCode}
              onChangeText={setMemberCode}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason / Audit Notes *</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
              placeholder="e.g. Scanner offline, member forgot RFID card..."
              placeholderTextColor="#64748B"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!memberCode.trim() || !notes.trim() || manualMutation.isPending) &&
                styles.submitBtnDisabled,
            ]}
            onPress={() => manualMutation.mutate()}
            disabled={!memberCode.trim() || !notes.trim() || manualMutation.isPending}
            activeOpacity={0.8}
          >
            {manualMutation.isPending ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <>
                <Check size={18} color="#0A0D14" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Record Entry</Text>
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
    marginBottom: 8,
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
  subtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 12,
    height: 48,
    marginTop: 6,
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
