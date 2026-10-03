/**
 * GymDeck Owner Mobile - High-Speed Collect Payment & Dues Modal
 *
 * Implements the canonical financial collection workflow:
 * SELECT MEMBER (if not pre-selected) -> ENTER/CONFIRM AMOUNT -> SELECT METHOD -> VERIFY -> COMMIT -> RECEIPT
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OwnerBillingService } from '../services/api/ownerBillingService';
import { OwnerMembersService } from '../services/api/ownerMembersService';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { BottomSheet } from './ui/BottomSheet';
import { useTheme } from '../theme';
import { formatCurrency } from '../utils/currency';
import { StatusBadge } from './StatusBadge';
import {
  DollarSign,
  Search,
  Check,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  AlertCircle,
  X,
} from 'lucide-react-native';

interface CollectPaymentModalProps {
  visible: boolean;
  memberId?: string;
  memberName?: string;
  memberCode?: string;
  defaultAmount?: number;
  onClose: () => void;
  onSuccess: (payment: any) => void;
}

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'UPI', label: 'UPI / QR', icon: Smartphone },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
] as const;

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  visible,
  memberId: initialMemberId,
  memberName: initialMemberName,
  memberCode: initialMemberCode,
  defaultAmount,
  onClose,
  onSuccess,
}) => {
  const { colors, typography, radii, shadows } = useTheme();
  const queryClient = useQueryClient();

  // Selected Member State
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    fullName: string;
    memberCode: string;
    phone?: string;
    membershipStatus?: string;
  } | null>(null);

  // Search state for when memberId is not pre-passed
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Payment form states
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER'>('CASH');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce search query (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync initial member props on open
  useEffect(() => {
    if (visible) {
      if (initialMemberId) {
        setSelectedMember({
          id: initialMemberId,
          fullName: initialMemberName || 'Member',
          memberCode: initialMemberCode || '',
        });
      } else {
        setSelectedMember(null);
      }
      setAmount(defaultAmount ? defaultAmount.toString() : '');
      setPaymentMethod('CASH');
      setTransactionRef('');
      setNotes('');
      setSearchQuery('');
      setErrorMessage(null);
    }
  }, [visible, initialMemberId, initialMemberName, initialMemberCode, defaultAmount]);

  // Query member candidates when searching
  const { data: membersData, isLoading: searchingMembers } = useQuery({
    queryKey: ['owner-members-search', debouncedSearch],
    queryFn: () => OwnerMembersService.getMembers(debouncedSearch || undefined, 'ALL', 15, 0),
    enabled: visible && !selectedMember,
  });

  // Query billing summary for selected member to display outstanding balance
  const { data: memberBilling } = useQuery({
    queryKey: ['owner-member-billing-summary', selectedMember?.id],
    queryFn: () => (selectedMember ? OwnerBillingService.getMemberBilling(selectedMember.id) : null),
    enabled: visible && !!selectedMember?.id,
  });

  // Update default amount if member has outstanding balance and amount isn't set yet
  useEffect(() => {
    if (memberBilling && memberBilling.outstandingBalance > 0 && !amount) {
      setAmount(memberBilling.outstandingBalance.toString());
    }
  }, [memberBilling, amount]);

  // Payment Mutation
  // Payment Mutation (Local-First with Transactional Outbox)
  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember) throw new Error('Please select a member.');
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid payment amount greater than ₹0.');
      }

      if (isDatabaseOpen()) {
        return localMutationService.recordPayment({
          memberId: selectedMember.id,
          amountMinorUnits: Math.round(numAmount * 100),
          paymentMethod,
          transactionReference: transactionRef.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }

      return OwnerBillingService.recordPayment(selectedMember.id, {
        amount: numAmount,
        paymentMethod,
        transactionReference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
        idempotencyKey: `APP-PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      });
    },
    onSuccess: (payment: any) => {
      queryClient.invalidateQueries({ queryKey: ['local-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['local-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['local-members'] });
      if (selectedMember) {
        queryClient.invalidateQueries({ queryKey: ['owner-member-detail', selectedMember.id] });
        queryClient.invalidateQueries({ queryKey: ['local-member-detail', selectedMember.id] });
        queryClient.invalidateQueries({ queryKey: ['owner-member-billing', selectedMember.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['owner-financial-dashboard'] });
      onSuccess(payment);
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Unable to record payment.');
    },
  });

  const handleSelectMember = (m: any) => {
    setSelectedMember({
      id: m.id,
      fullName: m.fullName,
      memberCode: m.memberCode,
      phone: m.phone,
      membershipStatus: m.membershipStatus,
    });
    setErrorMessage(null);
  };

  const handleResetMember = () => {
    setSelectedMember(null);
    setAmount('');
    setErrorMessage(null);
  };

  const isFormValid = !!selectedMember && Number(amount) > 0 && !isNaN(Number(amount));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Collect Payment"
      maxHeightRatio={0.88}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {/* Error Banner */}
          {errorMessage && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder, borderRadius: radii.sm },
              ]}
            >
              <AlertCircle size={16} color={colors.danger} style={{ marginRight: 8 }} />
              <Text style={[typography.captionBold, { color: colors.dangerText, flex: 1 }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* STEP 1: MEMBER SELECTION (If no member selected) */}
          {!selectedMember ? (
            <View style={styles.stepContainer}>
              <Text style={[typography.sectionTitle, { color: colors.textPrimary, marginBottom: 8 }]}>
                1. Select Member
              </Text>

              {/* Search Bar */}
              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <Search size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, typography.body, { color: colors.textPrimary }]}
                  placeholder="Search by name, phone, or code..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Candidate Members List */}
              <View style={styles.candidatesList}>
                {searchingMembers ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 8 }]}>
                      Finding members...
                    </Text>
                  </View>
                ) : (membersData?.members || []).length > 0 ? (
                  (membersData?.members || []).map((m: any) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.candidateRow,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderRadius: radii.md,
                        },
                      ]}
                      onPress={() => handleSelectMember(m)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${m.fullName}`}
                    >
                      <View
                        style={[
                          styles.candidateAvatar,
                          { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.md },
                        ]}
                      >
                        <Text style={[typography.cardTitle, { color: colors.primary }]}>
                          {(m.fullName || 'M').charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                          {m.fullName}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          {m.memberCode} • {m.phone}
                        </Text>
                      </View>

                      <StatusBadge status={m.membershipStatus} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyCandidates}>
                    <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>
                      {searchQuery ? 'No members match your search.' : 'Type a name or code to find member.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* STEP 2: PAYMENT DETAILS (When member is selected) */
            <View style={styles.stepContainer}>
              {/* Selected Member Header Card */}
              <View
                style={[
                  styles.selectedMemberCard,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
              >
                <View style={styles.memberCardContent}>
                  <View
                    style={[
                      styles.candidateAvatar,
                      { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.md },
                    ]}
                  >
                    <User size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                      {selectedMember.fullName}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {selectedMember.memberCode} {selectedMember.phone ? `• ${selectedMember.phone}` : ''}
                    </Text>
                  </View>
                  {!initialMemberId && (
                    <TouchableOpacity
                      onPress={handleResetMember}
                      style={[styles.changeBtn, { borderColor: colors.border, borderRadius: radii.xs }]}
                    >
                      <Text style={[typography.captionBold, { color: colors.primary }]}>Change</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Outstanding balance alert if present */}
                {memberBilling && memberBilling.outstandingBalance > 0 && (
                  <View
                    style={[
                      styles.dueContextPill,
                      { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder, borderRadius: radii.xs },
                    ]}
                  >
                    <AlertCircle size={12} color={colors.danger} style={{ marginRight: 4 }} />
                    <Text style={[typography.captionBold, { color: colors.dangerText }]}>
                      Outstanding Balance: {formatCurrency(memberBilling.outstandingBalance)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                  COLLECTION AMOUNT (₹) *
                </Text>
                <View
                  style={[
                    styles.amountContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.primary,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: colors.primary }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    autoFocus={!initialMemberId}
                  />
                </View>
              </View>

              {/* Payment Method Selector */}
              <View style={styles.inputGroup}>
                <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                  PAYMENT METHOD *
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
                            backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderRadius: radii.md,
                          },
                        ]}
                        onPress={() => setPaymentMethod(m.id)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Payment method ${m.label}`}
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

              {/* Reference / Transaction ID */}
              <View style={styles.inputGroup}>
                <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                  TRANSACTION / REFERENCE # (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="e.g. UPI Ref, Bank UTR, Card Auth"
                  placeholderTextColor={colors.textMuted}
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                />
              </View>

              {/* Audit Notes */}
              <View style={styles.inputGroup}>
                <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                  AUDIT NOTES (OPTIONAL)
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radii.md,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="e.g. Received at reception by Subham"
                  placeholderTextColor={colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Verification Summary Banner */}
              {isFormValid && (
                <View
                  style={[
                    styles.summaryBanner,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.borderSubtle,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Collecting{' '}
                    <Text style={{ fontWeight: '800', color: colors.textPrimary }}>
                      {formatCurrency(Number(amount))}
                    </Text>{' '}
                    via{' '}
                    <Text style={{ fontWeight: '800', color: colors.textPrimary }}>
                      {paymentMethod}
                    </Text>{' '}
                    from {selectedMember.fullName}.
                  </Text>
                </View>
              )}

              {/* Commit Action Button */}
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor: isFormValid ? colors.primary : colors.surfaceSubtle,
                    borderColor: isFormValid ? colors.primary : colors.border,
                    borderRadius: radii.md,
                  },
                ]}
                onPress={() => paymentMutation.mutate()}
                disabled={!isFormValid || paymentMutation.isPending}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Confirm and record payment"
              >
                {paymentMutation.isPending ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Check size={18} color={isFormValid ? colors.textOnPrimary : colors.textMuted} style={{ marginRight: 8 }} />
                    <Text
                      style={[
                        typography.button,
                        { color: isFormValid ? colors.textOnPrimary : colors.textMuted },
                      ]}
                    >
                      Confirm Payment
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  stepContainer: {
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  candidatesList: {
    gap: 8,
  },
  centerLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
  },
  candidateAvatar: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCandidates: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  selectedMemberCard: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  dueContextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  inputGroup: {
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 1.5,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '800',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
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
  textInput: {
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  summaryBanner: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    marginTop: 4,
  },
});
