/**
 * GymDeck Owner Mobile - Quick Member Check-In Modal
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
import { UserCheck, X, Check, Search } from 'lucide-react-native';

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [memberCode, setMemberCode] = useState('');

  const checkInMutation = useMutation({
    mutationFn: () => {
      const cleanCode = memberCode.trim().toUpperCase();
      if (!cleanCode) throw new Error('Please enter a valid Member Code');
      return OwnerAttendanceService.checkInMember({
        memberCode: cleanCode,
        entryMethod: 'CODE_LOOKUP',
        idempotencyKey: `CHK-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      Alert.alert(
        'Check-In Approved',
        `Welcome, ${res.fullName} (${res.memberCode})!`
      );
      setMemberCode('');
      onSuccess(res);
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Check-In Rejected', err?.message || 'Unable to check in member.');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <UserCheck size={22} color="#EAB308" style={{ marginRight: 6 }} />
              <Text style={styles.title}>Member Check-In</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Enter the member's code or tap below to check in.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Member Code</Text>
            <View style={styles.inputWrapper}>
              <Search size={18} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="e.g. GD-1001"
                placeholderTextColor="#64748B"
                value={memberCode}
                onChangeText={setMemberCode}
                autoCapitalize="characters"
                autoFocus
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!memberCode.trim() || checkInMutation.isPending) && styles.submitBtnDisabled,
            ]}
            onPress={() => checkInMutation.mutate()}
            disabled={!memberCode.trim() || checkInMutation.isPending}
            activeOpacity={0.8}
          >
            {checkInMutation.isPending ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <>
                <Check size={18} color="#0A0D14" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Confirm Check-In</Text>
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
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#EAB308',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: {
    flex: 1,
    color: '#EAB308',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 12,
    height: 48,
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
