/**
 * GymDeck Owner Mobile - Manual Attendance Entry Sheet
 *
 * Operational modal using Phase 02 BottomSheet:
 * - Records manual attendance with mandatory audit reason (min 3 chars)
 * - Canonical Light Theme tokens
 * - Clear validation & error feedback
 * - Thumb-friendly touch targets (>= 44pt)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerAttendanceService } from '../services/api/ownerAttendanceService';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { useTheme } from '../theme';
import { BottomSheet } from './ui/BottomSheet';
import { FileEdit, Check, AlertCircle } from 'lucide-react-native';

interface ManualAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { colors, typography, radii } = useTheme();

  const [memberCode, setMemberCode] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMemberCode('');
      setNotes('');
      setErrorMessage(null);
    }
  }, [visible]);

  const manualMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const cleanCode = memberCode.trim().toUpperCase();
      if (!cleanCode) throw new Error('Please enter a valid Member Code');
      if (!notes.trim() || notes.trim().length < 3) {
        throw new Error('Please enter a valid reason / notes (minimum 3 characters)');
      }

      if (isDatabaseOpen()) {
        const log = await localMutationService.checkInMember({
          memberCode: cleanCode,
          entryMethod: 'MANUAL',
          notes: notes.trim(),
        });
        return {
          fullName: 'Member',
          memberCode: cleanCode,
          record: log,
          isLocal: true,
        };
      }

      return OwnerAttendanceService.recordManualAttendance({
        memberCode: cleanCode,
        checkInTime: new Date().toISOString(),
        notes: notes.trim(),
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['local-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['local-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics-overview'] });
      const suffix = res.isLocal ? ' locally (Pending sync)' : '';
      Alert.alert(
        'Manual Attendance Logged',
        `Recorded manual entry for ${res.fullName} (${res.memberCode})${suffix}.`
      );
      onSuccess?.(res);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.message || 'Unable to record manual attendance.';
      setErrorMessage(msg);
    },
  });

  const isFormValid = memberCode.trim().length > 0 && notes.trim().length >= 3;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Manual Attendance Entry"
      subtitle="Log an attendance record with required audit reason"
      maxHeightRatio={0.82}
    >
      <View style={styles.container}>
        {errorMessage && (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.dangerBg,
                borderColor: colors.dangerBorder,
                borderRadius: radii.md,
              },
            ]}
          >
            <AlertCircle size={16} color={colors.danger} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={[typography.caption, { color: colors.dangerText, flex: 1, fontWeight: '600' }]}>
              {errorMessage}
            </Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
            Member Code *
          </Text>
          <TextInput
            style={[
              styles.input,
              typography.inputText,
              {
                backgroundColor: colors.surface,
                borderColor: memberCode.trim() ? colors.primary : colors.border,
                borderRadius: radii.md,
                color: colors.textPrimary,
              },
            ]}
            placeholder="e.g. GD-1001"
            placeholderTextColor={colors.textMuted}
            value={memberCode}
            onChangeText={(text) => setMemberCode(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
            Audit Reason / Notes *
          </Text>
          <TextInput
            style={[
              styles.textArea,
              typography.inputText,
              {
                backgroundColor: colors.surface,
                borderColor: notes.trim().length >= 3 ? colors.primary : colors.border,
                borderRadius: radii.md,
                color: colors.textPrimary,
              },
            ]}
            placeholder="e.g. Scanner offline, member forgot card, manual correction..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
            Minimum 3 characters required for system audit tracking.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.md,
            },
            (!isFormValid || manualMutation.isPending) && styles.submitBtnDisabled,
          ]}
          onPress={() => manualMutation.mutate()}
          disabled={!isFormValid || manualMutation.isPending}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Record Manual Entry"
        >
          {manualMutation.isPending ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <Check size={18} color={colors.textOnPrimary} style={{ marginRight: 8 }} />
              <Text style={[typography.button, { color: colors.textOnPrimary }]}>
                Record Manual Entry
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
});
