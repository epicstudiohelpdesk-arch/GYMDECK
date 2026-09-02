/**
 * GymDeck Owner Mobile - Add Member Admission Screen
 */

import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerMembersService } from '../../../src/services/api/ownerMembersService';
import { ArrowLeft, UserPlus, Check, AlertCircle } from 'lucide-react-native';

export default function AddMemberScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('MALE');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER'>('CASH');

  // Load available plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['owner-plans'],
    queryFn: () => OwnerMembersService.getPlans(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      OwnerMembersService.createMember({
        fullName: fullName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        gender,
        dob: dob.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        planId: selectedPlanId,
        initialPaymentAmount: initialPaymentAmount ? Number(initialPaymentAmount) : undefined,
        initialPaymentMethod: paymentMethod,
      }),
    onSuccess: (newMember) => {
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      Alert.alert('Member Admitted', `${newMember.fullName} was successfully registered.`);
      router.replace(`/(tabs)/members/${newMember.id}` as any);
    },
    onError: (err: any) => {
      Alert.alert('Admission Error', err?.message || 'Failed to create member record.');
    },
  });

  const handleSubmit = () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 7) {
      Alert.alert('Validation Error', 'A valid phone number is required.');
      return;
    }

    createMutation.mutate();
  };

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
          <Text style={styles.navTitle}>New Member Admission</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Identity Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Full Name <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. John Doe"
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="+1 555 0192"
                placeholderTextColor="#64748B"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alternate Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional emergency contact"
                placeholderTextColor="#64748B"
                value={alternatePhone}
                onChangeText={setAlternatePhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Gender Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {['MALE', 'FEMALE', 'OTHER'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderChip, gender === g && styles.genderChipSelected]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748B"
                value={dob}
                onChangeText={setDob}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Residential Address</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Street address, city, zip"
                placeholderTextColor="#64748B"
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
          </View>

          {/* Membership Plan Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Membership Plan</Text>

            {plansLoading ? (
              <ActivityIndicator color="#EAB308" />
            ) : (
              <View style={styles.plansList}>
                {(plansData || []).map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planCard, isSelected && styles.planCardSelected]}
                      onPress={() => setSelectedPlanId(isSelected ? undefined : plan.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planName, isSelected && { color: '#EAB308' }]}>
                          {plan.planName}
                        </Text>
                        <Text style={styles.planDuration}>{plan.durationDays} Days</Text>
                      </View>
                      <Text style={styles.planPrice}>${plan.price}</Text>
                      {isSelected && (
                        <View style={styles.checkCircle}>
                          <Check size={14} color="#0A0D14" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Initial Payment Section */}
          {selectedPlanId && (
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Initial Payment</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#64748B"
                  value={initialPaymentAmount}
                  onChangeText={setInitialPaymentAmount}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <View style={styles.genderRow}>
                  {(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[styles.genderChip, paymentMethod === method && styles.genderChipSelected]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text
                        style={[
                          styles.genderText,
                          paymentMethod === method && styles.genderTextSelected,
                        ]}
                      >
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Staff Notes</Text>
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="Health conditions, referral notes, goals..."
              placeholderTextColor="#64748B"
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <>
                <UserPlus size={18} color="#0A0D14" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Complete Admission</Text>
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
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 14,
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
  req: {
    color: '#EF4444',
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
  plansList: {
    gap: 10,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
  },
  planCardSelected: {
    borderColor: '#EAB308',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  planDuration: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
    marginRight: 10,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
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
});
