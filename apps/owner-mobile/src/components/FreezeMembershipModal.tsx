/**
 * GymDeck Owner Mobile - Freeze Membership Subscription Modal
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
import { OwnerMembershipService } from '../services/api/ownerMembershipService';
import { Snowflake, X, Check } from 'lucide-react-native';

interface FreezeMembershipModalProps {
  visible: boolean;
  memberId: string;
  membershipId: string;
  daysRemaining?: number;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const FreezeMembershipModal: React.FC<FreezeMembershipModalProps> = ({
  visible,
  memberId,
  membershipId,
  daysRemaining,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const freezeMutation = useMutation({
    mutationFn: () => {
      if (!reason.trim() || reason.trim().length < 3) {
        throw new Error('Please enter a valid reason (minimum 3 characters) to freeze subscription.');
      }
      return OwnerMembershipService.freezeMembership(memberId, membershipId, {
        reason: reason.trim(),
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['owner-member-profile', memberId] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-membership-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      Alert.alert(
        'Subscription Frozen',
        `Membership has been frozen. ${res.frozenDaysRemaining || daysRemaining || 'Remaining'} days are saved.`
      );
      setReason('');
      onSuccess(res);
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Freeze Failed', err?.message || 'Unable to freeze membership.');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Snowflake size={22} color="#38BDF8" style={{ marginRight: 6 }} />
              <Text style={styles.title}>Freeze Subscription</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Pausing this subscription will freeze attendance access and save the remaining {daysRemaining ?? ''} days until unfrozen.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Reason for Freeze *</Text>
            <TextInput
              style={[styles.input, { height: 64, textAlignVertical: 'top', paddingTop: 8 }]}
              placeholder="e.g. Traveling abroad, medical injury, vacation..."
              placeholderTextColor="#64748B"
              value={reason}
              onChangeText={setReason}
              multiline
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!reason.trim() || freezeMutation.isPending) && styles.submitBtnDisabled,
            ]}
            onPress={() => freezeMutation.mutate()}
            disabled={!reason.trim() || freezeMutation.isPending}
            activeOpacity={0.8}
          >
            {freezeMutation.isPending ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <>
                <Check size={18} color="#0A0D14" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Confirm Freeze</Text>
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
    borderColor: '#38BDF8',
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
    lineHeight: 18,
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
  input: {
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
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
