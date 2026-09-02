/**
 * GymDeck Owner Mobile - Add / Register Trainer Modal
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerTrainersService } from '../services/api/ownerTrainersService';
import { Award, X, Check, UserPlus, DollarSign } from 'lucide-react-native';

interface AddTrainerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddTrainerModal: React.FC<AddTrainerModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('Strength & Conditioning');
  const [experienceYears, setExperienceYears] = useState('3');
  const [commissionType, setCommissionType] = useState<'FIXED_PER_SESSION' | 'PERCENTAGE'>('FIXED_PER_SESSION');
  const [commissionRate, setCommissionRate] = useState('30.00');
  const [bio, setBio] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim() || fullName.trim().length < 2) {
        throw new Error('Full name is required (min 2 characters).');
      }
      if (!phone.trim() || phone.trim().length < 7) {
        throw new Error('Valid phone number is required.');
      }

      return await OwnerTrainersService.createTrainer({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        specialization: specialization.trim() || undefined,
        experienceYears: parseInt(experienceYears, 10) || 1,
        commissionType,
        commissionRate: parseFloat(commissionRate) || 0,
        bio: bio.trim() || undefined,
      });
    },
    onSuccess: () => {
      Alert.alert('Trainer Added', 'Personal trainer successfully registered in the gym.');
      queryClient.invalidateQueries({ queryKey: ['owner-trainers'] });
      queryClient.invalidateQueries({ queryKey: ['owner-trainers-list'] });
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      Alert.alert(
        'Action Failed',
        err?.response?.data?.message || err.message || 'Failed to add trainer.'
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
              <UserPlus size={22} color="#EAB308" style={{ marginRight: 8 }} />
              <Text style={styles.title}>Register Personal Trainer</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Add certified coaching staff to gym profile</Text>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>FULL NAME *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Alexander Cole"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>PHONE NUMBER *</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +1 555-0192"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>EMAIL ADDRESS (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="e.g. alex@gymdeck.com"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { marginTop: 14 }]}>SPECIALIZATION</Text>
                <TextInput
                  style={styles.input}
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="e.g. Powerlifting"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={{ width: 100, marginLeft: 8 }}>
                <Text style={[styles.label, { marginTop: 14 }]}>EXP (YRS)</Text>
                <TextInput
                  style={styles.input}
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>COMMISSION TYPE</Text>
            <View style={styles.commTypeRow}>
              <TouchableOpacity
                style={[
                  styles.commBtn,
                  commissionType === 'FIXED_PER_SESSION' && styles.commBtnSelected,
                ]}
                onPress={() => setCommissionType('FIXED_PER_SESSION')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.commText,
                    commissionType === 'FIXED_PER_SESSION' && styles.commTextSelected,
                  ]}
                >
                  Fixed / Session ($)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.commBtn,
                  commissionType === 'PERCENTAGE' && styles.commBtnSelected,
                ]}
                onPress={() => setCommissionType('PERCENTAGE')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.commText,
                    commissionType === 'PERCENTAGE' && styles.commTextSelected,
                  ]}
                >
                  Percentage (%)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>COMMISSION RATE</Text>
            <TextInput
              style={styles.input}
              value={commissionRate}
              onChangeText={setCommissionRate}
              keyboardType="decimal-pad"
              placeholder="30.00"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>BIO / SUMMARY (OPTIONAL)</Text>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={setBio}
              placeholder="e.g. Former state powerlifting champion specializing in strength..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
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
                (!fullName.trim() || !phone.trim() || createMutation.isPending) &&
                  styles.submitBtnDisabled,
              ]}
              onPress={() => createMutation.mutate()}
              disabled={!fullName.trim() || !phone.trim() || createMutation.isPending}
              activeOpacity={0.8}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <>
                  <Check size={18} color="#000000" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Create Trainer</Text>
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
  commTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  commBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  commBtnSelected: {
    borderColor: '#EAB308',
    backgroundColor: '#2A2410',
  },
  commText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  commTextSelected: {
    color: '#EAB308',
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
