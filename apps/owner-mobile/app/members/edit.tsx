/**
 * GymDeck Owner Mobile - Edit Member Profile Screen
 *
 * Light-first canonical experience with dark theme toggle support.
 * Allows gym owners and managers to update member details, contact info,
 * and operational lifecycle status (ACTIVE, EXPIRED, FROZEN, INACTIVE).
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerMembersService } from '../../src/services/api/ownerMembersService';
import { localMutationService } from '../../src/services/LocalMutationService';
import { isDatabaseOpen } from '../../src/database/LocalDatabaseManager';
import { useTheme } from '../../src/theme';
import { Avatar } from '../../src/components/ui/Avatar';
import { StatusBadge } from '../../src/components/StatusBadge';
import { FormInput } from '../../src/components/ui/FormInput';
import { PrimaryButton, SecondaryButton } from '../../src/components/ui/Button';
import {
  ArrowLeft,
  Save,
  Check,
  User,
  Phone,
  PhoneCall,
  Mail,
  Calendar,
  MapPin,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Ban,
  Sparkles,
} from 'lucide-react-native';

const STATUS_CONFIG = [
  {
    id: 'ACTIVE' as const,
    label: 'Active',
    description: 'Check-in desk access permitted',
    icon: CheckCircle2,
    colorKey: 'success' as const,
    bgKey: 'successBg' as const,
    borderKey: 'successBorder' as const,
  },
  {
    id: 'EXPIRED' as const,
    label: 'Expired',
    description: 'Subscription lapsed, renewal required',
    icon: AlertCircle,
    colorKey: 'danger' as const,
    bgKey: 'dangerBg' as const,
    borderKey: 'dangerBorder' as const,
  },
  {
    id: 'FROZEN' as const,
    label: 'Frozen',
    description: 'Temporarily paused, days preserved',
    icon: Clock,
    colorKey: 'special' as const,
    bgKey: 'specialBg' as const,
    borderKey: 'specialBorder' as const,
  },
  {
    id: 'INACTIVE' as const,
    label: 'Inactive',
    description: 'Account archived / deactivated',
    icon: Ban,
    colorKey: 'textSecondary' as const,
    bgKey: 'surfaceSubtle' as const,
    borderKey: 'border' as const,
  },
] as const;

const GENDER_OPTIONS = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
] as const;

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  // Load Member Details
  const { data, isLoading, isPending, error } = useQuery({
    queryKey: ['owner-member-detail', id],
    queryFn: () => OwnerMembersService.getMemberById(id!),
    enabled: !!id,
  });

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [membershipStatus, setMembershipStatus] = useState<'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');

  // Validation
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({});

  // Populate form with existing data
  useEffect(() => {
    if (data?.member) {
      const m = data.member;
      setFullName(m.fullName || '');
      setPhone(m.phone || '');
      setAlternatePhone(m.alternatePhone || '');
      setEmail(m.email || '');
      setGender((m.gender as any) || 'MALE');
      setDob(m.dob || '');
      setAddress(m.address || '');
      setMembershipStatus((m.membershipStatus as any) || 'ACTIVE');
      setNotes(m.notes || '');
    }
  }, [data]);

  // Update Mutation (Local-First with Transactional Outbox)
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (isDatabaseOpen()) {
        return localMutationService.updateMember(id!, {
          fullName: fullName.trim(),
          phone: phone.trim(),
          alternatePhone: alternatePhone.trim() || undefined,
          email: email.trim() || undefined,
          gender,
          dob: dob.trim() || undefined,
          address: address.trim() || undefined,
          membershipStatus,
          notes: notes.trim() || undefined,
        });
      }

      return OwnerMembersService.updateMember(id!, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        email: email.trim() || undefined,
        gender,
        dob: dob.trim() || undefined,
        address: address.trim() || undefined,
        membershipStatus,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ['owner-member-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['local-member-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-members'] });
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      const memberName = updated.full_name || updated.fullName;
      Alert.alert('Changes Saved', `${memberName}'s profile was successfully updated locally (Pending sync).`, [
        {
          text: 'Done',
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Update Failed', err?.message || 'Unable to update member details.');
    },
  });

  const validate = () => {
    const newErrors: { fullName?: string; phone?: string } = {};
    if (!fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      newErrors.phone = 'Valid phone number is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please check required fields.');
      return;
    }
    updateMutation.mutate();
  };

  const handleDiscard = () => {
    Alert.alert('Discard Changes?', 'Any unsaved modifications to this member profile will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (!id || isLoading || isPending || (!data && !error)) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: 12 }]}>
            Loading Member Details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const member = data?.member;

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
              Edit Member Profile
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {member?.memberCode || 'Member Info'}
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
          {/* MEMBER IDENTITY HERO CARD */}
          {member && (
            <View
              style={[
                styles.identityHeroCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
                shadows.low,
              ]}
            >
              <Avatar
                name={fullName || member.fullName}
                size="lg"
                showStatusDot={membershipStatus === 'ACTIVE'}
                statusDotColor={colors.success}
              />

              <View style={styles.heroDetails}>
                <View style={styles.heroNameRow}>
                  <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 18, flex: 1 }]} numberOfLines={1}>
                    {fullName || member.fullName}
                  </Text>
                  <StatusBadge status={membershipStatus} />
                </View>

                <Text style={[typography.captionBold, { color: colors.textSecondary, marginTop: 2 }]}>
                  Code: {member.memberCode}
                </Text>

                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  Enrolled: {new Date(member.joinedAt || member.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            </View>
          )}

          {/* SECTION 1: MEMBERSHIP LIFECYCLE STATUS */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              shadows.low,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primarySoft }]}>
                <ShieldCheck size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  Membership Lifecycle Status
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Defines access privileges at reception desk & access turnstiles
                </Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.statusGrid}>
              {STATUS_CONFIG.map((st) => {
                const isSelected = membershipStatus === st.id;
                const IconComp = st.icon;
                const statusColor = colors[st.colorKey];
                const statusBg = colors[st.bgKey];

                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.statusOptionCard,
                      {
                        backgroundColor: isSelected ? statusBg : colors.surfaceSubtle,
                        borderColor: isSelected ? statusColor : colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                    onPress={() => setMembershipStatus(st.id)}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.statusCardTop}>
                      <View
                        style={[
                          styles.statusIconCircle,
                          { backgroundColor: isSelected ? colors.surface : colors.surfaceSubtle },
                        ]}
                      >
                        <IconComp size={16} color={isSelected ? statusColor : colors.textSecondary} />
                      </View>
                      {isSelected && (
                        <View
                          style={[
                            styles.statusCheckIndicator,
                            { backgroundColor: statusColor, borderRadius: radii.full },
                          ]}
                        >
                          <Check size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        typography.cardTitle,
                        { color: isSelected ? statusColor : colors.textPrimary, marginTop: 8 },
                      ]}
                    >
                      {st.label}
                    </Text>

                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textSecondary, marginTop: 2 },
                      ]}
                      numberOfLines={2}
                    >
                      {st.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION 2: PERSONAL & CONTACT INFORMATION */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg },
              shadows.low,
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.infoBg }]}>
                <User size={18} color={colors.info} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  Personal & Contact Information
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Official contact records for billing, emergencies & communication
                </Text>
              </View>
            </View>

            <View style={[styles.cardDivider, { backgroundColor: colors.borderSubtle }]} />

            {/* Full Name */}
            <FormInput
              label="Full Name"
              required
              placeholder="Full Name"
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
              label="Primary Phone Number"
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
              helperText="Primary mobile number for QR check-in & WhatsApp"
            />

            {/* Alternate Phone */}
            <FormInput
              label="Alternate / Emergency Phone"
              placeholder="Emergency contact phone"
              value={alternatePhone}
              onChangeText={setAlternatePhone}
              keyboardType="phone-pad"
              prefixIcon={<PhoneCall size={16} color={colors.textMuted} />}
            />

            {/* Email Address */}
            <FormInput
              label="Email Address"
              placeholder="member@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              prefixIcon={<Mail size={16} color={colors.textMuted} />}
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
              placeholder="YYYY-MM-DD"
              value={dob}
              onChangeText={setDob}
              prefixIcon={<Calendar size={16} color={colors.textMuted} />}
              helperText="Format: YYYY-MM-DD"
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
                  placeholder="Street address, apartment, city, zip..."
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

          {/* SECTION 3: STAFF REMARKS & MEDICAL NOTES */}
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
                  Staff Remarks & Health Notes
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Internal notes for coaches, medical conditions, goals, or referral
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
                placeholder="Medical history, knee injury, workout preferences, referral notes..."
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
            <View style={{ flex: 1, marginRight: 10 }}>
              <SecondaryButton
                label="Cancel"
                onPress={handleDiscard}
                disabled={updateMutation.isPending}
                size="md"
              />
            </View>

            <View style={{ flex: 2 }}>
              <PrimaryButton
                label="Save Changes"
                icon={<Save size={18} color={colors.textOnPrimary} />}
                onPress={handleSave}
                loading={updateMutation.isPending}
                size="md"
                accessibilityLabel="Save member profile changes"
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  identityHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
  },
  heroDetails: {
    flex: 1,
    marginLeft: 14,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusOptionCard: {
    width: '48%',
    padding: 12,
    borderWidth: 1.5,
    minHeight: 110,
  },
  statusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheckIndicator: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
