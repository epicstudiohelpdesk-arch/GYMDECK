/**
 * GymDeck Owner Mobile - New Member Admission Screen
 *
 * Light-first canonical experience with dark theme toggle support.
 * Designed for lightning-fast onboarding at the gym front desk:
 * 1. Personal & Contact Details
 * 2. Membership Plan Picker (with live pricing in INR)
 * 3. Initial Fee Collection & Ledger Allocation (Quick Presets, UPI/Cash/Card/Bank)
 * 4. Staff Remarks & Health Goals
 * 5. Sticky Bottom Action Bar with Real-time Summary
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
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { localMutationService } from '../../src/services/LocalMutationService';
import { isDatabaseOpen } from '../../src/database/LocalDatabaseManager';
import { useTheme } from '../../src/theme';
import { formatCurrency } from '../../src/utils/currency';
import { FormInput } from '../../src/components/ui/FormInput';
import { PrimaryButton } from '../../src/components/ui/Button';
import {
  ArrowLeft,
  UserPlus,
  Check,
  User,
  Phone,
  PhoneCall,
  Mail,
  Calendar,
  MapPin,
  Award,
  Wallet,
  FileText,
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react-native';

const GENDER_OPTIONS = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
] as const;

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'BANK_TRANSFER', label: 'Net Banking', icon: Building2 },
] as const;

export default function AddMemberScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors, typography, radii, shadows } = useTheme();

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Personal Info State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Plan & Payment State
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(undefined);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER'>('CASH');

  // Inline Validation State
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; payment?: string }>({});

  // Load available plans
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['owner-plans'],
    queryFn: () => OwnerMembersService.getPlans(),
  });

  const selectedPlan = (plansData || []).find((p) => p.id === selectedPlanId);

  // Handle plan selection & set default payment amount
  const handleSelectPlan = (planId: string) => {
    if (selectedPlanId === planId) {
      // Deselect
      setSelectedPlanId(undefined);
      setInitialPaymentAmount('');
    } else {
      setSelectedPlanId(planId);
      const plan = (plansData || []).find((p) => p.id === planId);
      if (plan) {
        setInitialPaymentAmount(plan.price.toString());
      }
    }
    setErrors((prev) => ({ ...prev, payment: undefined }));
  };

  // Quick payment amount presets
  const handleSetFullPayment = () => {
    if (selectedPlan) {
      setInitialPaymentAmount(selectedPlan.price.toString());
    }
  };

  const handleSetZeroPayment = () => {
    setInitialPaymentAmount('0');
  };

  // Admission Mutation (Local-First with Transactional Outbox)
  const createMutation = useMutation({
    mutationFn: async () => {
      if (isDatabaseOpen()) {
        return localMutationService.admitMember({
          fullName: fullName.trim(),
          phone: phone.trim(),
          alternatePhone: alternatePhone.trim() || undefined,
          email: email.trim() || undefined,
          gender,
          dob: dob.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          planId: selectedPlanId,
          initialPaymentAmount: initialPaymentAmount !== '' ? Number(initialPaymentAmount) : undefined,
          initialPaymentMethod: selectedPlanId ? paymentMethod : undefined,
        });
      }

      const newMember = await OwnerMembersService.createMember({
        fullName: fullName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        gender,
        dob: dob.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        planId: selectedPlanId,
        initialPaymentAmount: initialPaymentAmount !== '' ? Number(initialPaymentAmount) : undefined,
        initialPaymentMethod: selectedPlanId ? paymentMethod : undefined,
      });
      return { member: newMember, isLocalOnly: false };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['local-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['owner-financial-dashboard'] });

      const memberName = result.member?.full_name || result.member?.fullName;
      const memberCode = result.member?.member_code || result.member?.memberCode;
      const memberId = result.member?.id;
      const statusSuffix = result.isLocalOnly ? '\nSaved locally (Pending sync)' : '';

      Alert.alert(
        'Member Admitted Successfully',
        `${memberName} (${memberCode}) is registered.${statusSuffix}`,
        [
          {
            text: 'View Member Profile',
            onPress: () => router.replace(`/members/${memberId}` as any),
          },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert('Admission Failed', err?.message || 'Failed to create member record. Please verify fields.');
    },
  });

  const validate = () => {
    const newErrors: { fullName?: string; phone?: string; payment?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      newErrors.phone = 'Valid phone number is required (min 7 digits).';
    }

    if (selectedPlanId && initialPaymentAmount !== '') {
      const num = Number(initialPaymentAmount);
      if (isNaN(num) || num < 0) {
        newErrors.payment = 'Please enter a valid non-negative payment amount.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Alert.alert('Incomplete Form', 'Please review highlighted fields before completing admission.');
      return;
    }
    createMutation.mutate();
  };

  // Calculate balance due for preview
  const planPriceNum = selectedPlan ? Number(selectedPlan.price) : 0;
  const paymentNum = initialPaymentAmount !== '' ? Number(initialPaymentAmount) : 0;
  const calculatedDue = Math.max(0, planPriceNum - (isNaN(paymentNum) ? 0 : paymentNum));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top App Header */}
        <View
          style={[
            styles.navBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
            shadows.low,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.navBack,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
            ]}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.navTitleContainer}>
            <Text style={[typography.sectionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              New Member Admission
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Register member & assign plan
            </Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 170 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {/* SECTION 1: PERSONAL INFORMATION */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              shadows.low,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primarySoft }]}>
                <User size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  Personal Information
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Identity and contact details for member pass & notifications
                </Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Full Name */}
            <FormInput
              label="Full Name"
              required
              placeholder="e.g. Vikram Sharma"
              value={fullName}
              onChangeText={(val) => {
                setFullName(val);
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
              }}
              prefixIcon={<User size={16} color={colors.textMuted} />}
              error={errors.fullName}
            />

            {/* Phone Number */}
            <FormInput
              label="Phone Number"
              required
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              keyboardType="phone-pad"
              prefixIcon={<Phone size={16} color={colors.textMuted} />}
              error={errors.phone}
              helperText="Primary number used for gym check-in & WhatsApp updates"
            />

            {/* Alternate Phone */}
            <FormInput
              label="Alternate / Emergency Phone"
              placeholder="Optional guardian or emergency contact"
              value={alternatePhone}
              onChangeText={setAlternatePhone}
              keyboardType="phone-pad"
              prefixIcon={<PhoneCall size={16} color={colors.textMuted} />}
            />

            {/* Email Address */}
            <FormInput
              label="Email Address"
              placeholder="vikram.sharma@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              prefixIcon={<Mail size={16} color={colors.textMuted} />}
              helperText="Optional for invoice delivery & portal invite"
            />

            {/* Gender Selector */}
            <View style={styles.inputGroup}>
              <Text style={[typography.formLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
                Gender
              </Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((g) => {
                  const isSelected = gender === g.id;
                  return (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.genderChip,
                        {
                          backgroundColor: isSelected ? colors.primarySoft : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderRadius: radii.md,
                        },
                      ]}
                      onPress={() => setGender(g.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          typography.captionBold,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {g.label}
                      </Text>
                      {isSelected && (
                        <Check size={14} color={colors.primary} style={{ marginLeft: 6 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date of Birth */}
            <FormInput
              label="Date of Birth"
              placeholder="YYYY-MM-DD (e.g. 1995-08-24)"
              value={dob}
              onChangeText={setDob}
              prefixIcon={<Calendar size={16} color={colors.textMuted} />}
              helperText="Helps verify age category and birthday greetings"
            />

            {/* Residential Address */}
            <View style={styles.inputGroup}>
              <Text style={[typography.formLabel, { color: colors.textPrimary, marginBottom: 6 }]}>
                Residential Address
              </Text>
              <View
                style={[
                  styles.textAreaWrapper,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <MapPin size={16} color={colors.textMuted} style={styles.textAreaIcon} />
                <TextInput
                  style={[
                    styles.textArea,
                    typography.body,
                    { color: colors.textPrimary },
                  ]}
                  placeholder="Flat / Building, Street, City, PIN"
                  placeholderTextColor={colors.textMuted}
                  value={address}
                  onChangeText={setAddress}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* SECTION 2: MEMBERSHIP PLAN ALLOCATION */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              shadows.low,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.infoBg }]}>
                <Award size={18} color={colors.info} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  Membership Plan
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Select subscription package or register as pay-as-you-go
                </Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

            {plansLoading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>
                  Loading membership plans...
                </Text>
              </View>
            ) : (
              <View style={styles.plansList}>
                {(plansData || []).map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                          borderColor: isSelected ? colors.primary : colors.border,
                          borderRadius: radii.md,
                        },
                      ]}
                      onPress={() => handleSelectPlan(plan.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${plan.planName} for ${formatCurrency(plan.price)}`}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={styles.planTitleRow}>
                          <Text
                            style={[
                              typography.cardTitle,
                              { color: isSelected ? colors.primary : colors.textPrimary },
                            ]}
                          >
                            {plan.planName}
                          </Text>
                          <View
                            style={[
                              styles.durationPill,
                              {
                                backgroundColor: isSelected ? colors.surface : colors.surfaceSubtle,
                                borderColor: isSelected ? colors.primaryBorder : colors.borderSubtle,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                typography.captionBold,
                                { color: isSelected ? colors.primary : colors.textSecondary, fontSize: 10 },
                              ]}
                            >
                              {plan.durationDays} Days
                            </Text>
                          </View>
                        </View>

                        {plan.description ? (
                          <Text
                            style={[typography.caption, { color: colors.textSecondary, marginTop: 4 }]}
                            numberOfLines={1}
                          >
                            {plan.description}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.planPriceCol}>
                        <Text
                          style={[
                            typography.sectionTitle,
                            { color: isSelected ? colors.primary : colors.textPrimary, fontWeight: '800' },
                          ]}
                        >
                          {formatCurrency(plan.price)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.selectionIndicator,
                          {
                            borderColor: isSelected ? colors.primary : colors.borderStrong,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            borderRadius: radii.full,
                          },
                        ]}
                      >
                        {isSelected && <Check size={12} color={colors.textOnPrimary} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Skip Plan Option */}
                <TouchableOpacity
                  style={[
                    styles.skipPlanCard,
                    {
                      backgroundColor: selectedPlanId === undefined ? colors.surfaceSubtle : colors.surface,
                      borderColor: selectedPlanId === undefined ? colors.borderStrong : colors.borderSubtle,
                      borderRadius: radii.md,
                    },
                  ]}
                  onPress={() => {
                    setSelectedPlanId(undefined);
                    setInitialPaymentAmount('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyMedium, { color: colors.textPrimary }]}>
                      Admit Without Subscription Plan
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                      Account will be created in directory without an active plan
                    </Text>
                  </View>
                  {selectedPlanId === undefined && (
                    <CheckCircle2 size={18} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* SECTION 3: INITIAL PAYMENT & COLLECTION (When Plan is Selected) */}
          {selectedPlan && (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                shadows.low,
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: colors.successBg }]}>
                  <Wallet size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                    Initial Fee Collection
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Record initial payment or carry remaining dues to member's ledger
                  </Text>
                </View>
              </View>

              <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

              {/* Quick Amount Preset Buttons */}
              <View style={styles.presetRow}>
                <TouchableOpacity
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor:
                        initialPaymentAmount === selectedPlan.price.toString()
                          ? colors.primarySoft
                          : colors.surfaceSubtle,
                      borderColor:
                        initialPaymentAmount === selectedPlan.price.toString()
                          ? colors.primary
                          : colors.border,
                      borderRadius: radii.sm,
                    },
                  ]}
                  onPress={handleSetFullPayment}
                  activeOpacity={0.7}
                >
                  <Sparkles size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      typography.captionBold,
                      {
                        color:
                          initialPaymentAmount === selectedPlan.price.toString()
                            ? colors.primary
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Full: {formatCurrency(selectedPlan.price)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.presetBtn,
                    {
                      backgroundColor:
                        initialPaymentAmount === '0' ? colors.warningBg : colors.surfaceSubtle,
                      borderColor:
                        initialPaymentAmount === '0' ? colors.warning : colors.border,
                      borderRadius: radii.sm,
                    },
                  ]}
                  onPress={handleSetZeroPayment}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      typography.captionBold,
                      { color: initialPaymentAmount === '0' ? colors.warningText : colors.textSecondary },
                    ]}
                  >
                    Pay Later (₹0)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Collection Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[typography.formLabel, { color: colors.textPrimary, marginBottom: 6 }]}>
                  Payment Amount Received (₹)
                </Text>
                <View
                  style={[
                    styles.amountInputContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: errors.payment ? colors.danger : colors.borderStrong,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Text style={[styles.currencySymbol, { color: colors.primary }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={initialPaymentAmount}
                    onChangeText={(val) => {
                      setInitialPaymentAmount(val);
                      if (errors.payment) setErrors((prev) => ({ ...prev, payment: undefined }));
                    }}
                    keyboardType="numeric"
                  />
                </View>
                {errors.payment && (
                  <Text style={[typography.errorText, { color: colors.danger, marginTop: 4 }]}>
                    {errors.payment}
                  </Text>
                )}
              </View>

              {/* Payment Method Grid */}
              <View style={styles.inputGroup}>
                <Text style={[typography.formLabel, { color: colors.textPrimary, marginBottom: 6 }]}>
                  Payment Method
                </Text>
                <View style={styles.methodsGrid}>
                  {PAYMENT_METHODS.map((m) => {
                    const isSelected = paymentMethod === m.id;
                    const IconComp = m.icon;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.methodTile,
                          {
                            backgroundColor: isSelected ? colors.primarySoft : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderRadius: radii.md,
                          },
                        ]}
                        onPress={() => setPaymentMethod(m.id)}
                        activeOpacity={0.7}
                      >
                        <IconComp
                          size={18}
                          color={isSelected ? colors.primary : colors.textSecondary}
                          style={{ marginBottom: 4 }}
                        />
                        <Text
                          style={[
                            typography.captionBold,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Due / Balance Preview Banner */}
              <View
                style={[
                  styles.duePreviewBanner,
                  {
                    backgroundColor: calculatedDue > 0 ? colors.warningBg : colors.successBg,
                    borderColor: calculatedDue > 0 ? colors.warningBorder : colors.successBorder,
                    borderRadius: radii.md,
                  },
                ]}
              >
                {calculatedDue > 0 ? (
                  <>
                    <AlertCircle size={16} color={colors.warning} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.captionBold, { color: colors.warningText }]}>
                        Pending Balance: {formatCurrency(calculatedDue)}
                      </Text>
                      <Text style={[typography.caption, { color: colors.warningText, marginTop: 1 }]}>
                        This amount will be added to the member's account dues.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.captionBold, { color: colors.successText }]}>
                        Plan Fee Fully Settled
                      </Text>
                      <Text style={[typography.caption, { color: colors.successText, marginTop: 1 }]}>
                        Official receipt will be recorded with ₹0 outstanding balance.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* SECTION 4: STAFF REMARKS & NOTES */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              shadows.low,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.specialBg }]}>
                <FileText size={18} color={colors.special} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  Staff Remarks & Health Goals
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Internal notes for coaches, medical conditions, or referral source
                </Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

            <View
              style={[
                styles.textAreaWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
            >
              <FileText size={16} color={colors.textMuted} style={styles.textAreaIcon} />
              <TextInput
                style={[
                  styles.textArea,
                  typography.body,
                  { color: colors.textPrimary, height: 74 },
                ]}
                placeholder="e.g. Weight loss focus, recovering from left knee ACL surgery, referred by Rahul..."
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        {/* STICKY BOTTOM ACTION BAR */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              bottom: isKeyboardVisible ? 0 : 72 + Math.max(insets.bottom, 10) + 8,
              paddingBottom: isKeyboardVisible ? Math.max(insets.bottom, 12) : 10,
            },
            shadows.high,
          ]}
        >
          <View style={styles.bottomBarContent}>
            {/* Real-time Summary Info */}
            <View style={styles.summaryContainer}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {selectedPlan ? selectedPlan.planName : 'No Subscription Plan'}
              </Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary, fontSize: 16 }]}>
                {selectedPlan
                  ? `Pay: ${formatCurrency(paymentNum)}`
                  : 'Pay-as-you-go'}
              </Text>
            </View>

            {/* Complete Admission Primary Button */}
            <View style={{ flex: 1, marginLeft: 16 }}>
              <PrimaryButton
                label="Complete Admission"
                icon={<UserPlus size={18} color={colors.textOnPrimary} />}
                onPress={handleSubmit}
                loading={createMutation.isPending}
                size="md"
                accessibilityLabel="Complete member admission"
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  navBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  navBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDivider: {
    height: 1,
    width: '100%',
    marginVertical: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
  textAreaWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 80,
  },
  textAreaIcon: {
    marginTop: 4,
    marginRight: 8,
  },
  textArea: {
    flex: 1,
    padding: 0,
  },
  centerLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  plansList: {
    gap: 10,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1.5,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  planPriceCol: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  selectionIndicator: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    height: '100%',
  },
  methodsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  methodTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    minHeight: 56,
  },
  duePreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryContainer: {
    minWidth: 100,
  },
});
