/**
 * GymDeck Owner Mobile - Edit Member Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { ArrowLeft, Save } from 'lucide-react-native';

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isPending } = useQuery({
    queryKey: ['owner-member-detail', id],
    queryFn: () => OwnerMembersService.getMemberById(id!),
    enabled: !!id,
  });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('MALE');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [membershipStatus, setMembershipStatus] = useState<'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (data?.member) {
      const m = data.member;
      setFullName(m.fullName || '');
      setPhone(m.phone || '');
      setAlternatePhone(m.alternatePhone || '');
      setEmail(m.email || '');
      setGender(m.gender || 'MALE');
      setDob(m.dob || '');
      setAddress(m.address || '');
      setMembershipStatus(m.membershipStatus as any || 'ACTIVE');
      setNotes(m.notes || '');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () =>
      OwnerMembersService.updateMember(id!, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        gender,
        dob: dob.trim() || undefined,
        address: address.trim() || undefined,
        membershipStatus,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      Alert.alert('Saved', 'Member details updated successfully.');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Update Failed', err?.message || 'Unable to update member details.');
    },
  });

  if (!id || isLoading || isPending || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EAB308" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navBack} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#F8FAFC" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Edit Member</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alternate Phone</Text>
              <TextInput
                style={styles.input}
                value={alternatePhone}
                onChangeText={setAlternatePhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Membership Status</Text>
              <View style={styles.genderRow}>
                {(['ACTIVE', 'EXPIRED', 'FROZEN', 'INACTIVE'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.genderChip, membershipStatus === st && styles.genderChipSelected]}
                    onPress={() => setMembershipStatus(st)}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        membershipStatus === st && styles.genderTextSelected,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Residential Address</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Staff Notes</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, updateMutation.isPending && styles.submitBtnDisabled]}
            onPress={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            activeOpacity={0.8}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <>
                <Save size={18} color="#0A0D14" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navBack: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#131823',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#131823',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 18,
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
    height: 46,
    color: '#F8FAFC',
    fontSize: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  genderChip: {
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  genderChipSelected: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#EAB308',
  },
  genderText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  genderTextSelected: {
    color: '#EAB308',
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 14,
    height: 52,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#0A0D14',
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
