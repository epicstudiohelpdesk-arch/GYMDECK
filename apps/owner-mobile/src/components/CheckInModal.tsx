/**
 * GymDeck Owner Mobile - High-Speed Member Check-In Sheet
 *
 * Operational check-in modal using Phase 02 BottomSheet:
 * 1. Fast Member Search (Name, Phone, Member Code via OwnerMembersService.getMembers)
 * 2. Instant Code Lookup ("GD-XXXX" direct 1-tap entry)
 * 3. Clean error reporting for expired/frozen memberships or 2-hour duplicate cooldown
 * 4. Canonical Light Theme tokens & thumb-friendly touch targets (>= 44pt)
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OwnerAttendanceService } from '../services/api/ownerAttendanceService';
import { OwnerMembersService } from '../services/api/ownerMembersService';
import { localMutationService } from '../services/LocalMutationService';
import { isDatabaseOpen } from '../database/LocalDatabaseManager';
import { GymMemberSummary } from '../types';
import { useTheme } from '../theme';
import { BottomSheet } from './ui/BottomSheet';
import { Avatar } from './ui/Avatar';
import { StatusBadge } from './StatusBadge';
import { Search, UserCheck, Check, AlertCircle, Hash, Users } from 'lucide-react-native';

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (result: any) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { colors, typography, radii } = useTheme();

  const [activeTab, setActiveTab] = useState<'SEARCH' | 'CODE'>('SEARCH');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [directCode, setDirectCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce search query for instant member lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset form when opened/closed
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setDebouncedSearch('');
      setDirectCode('');
      setErrorMessage(null);
    }
  }, [visible]);

  // Query matching members
  const {
    data: memberSearchResults,
    isFetching: isSearchingMembers,
  } = useQuery({
    queryKey: ['owner-checkin-search', debouncedSearch],
    queryFn: () => OwnerMembersService.getMembers(debouncedSearch, 'ALL', 5),
    enabled: visible && activeTab === 'SEARCH' && debouncedSearch.length >= 2,
    staleTime: 10000,
  });

  const matchingMembers = memberSearchResults?.members || [];

  // Check-In Mutation (Local-First with Transactional Outbox)
  const checkInMutation = useMutation({
    mutationFn: async (params: { memberId?: string; memberCode?: string }) => {
      setErrorMessage(null);
      if (isDatabaseOpen()) {
        const res = await localMutationService.checkInMember({
          ...params,
          entryMethod: 'CODE_LOOKUP',
        });
        return {
          fullName: (res as any).full_name || (res as any).fullName || 'Member',
          memberCode: (res as any).member_code || (res as any).memberCode || params.memberCode || '',
          isLocal: true,
        };
      }

      const idempotencyKey = `CHK-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      return OwnerAttendanceService.checkInMember({
        ...params,
        entryMethod: 'CODE_LOOKUP',
        idempotencyKey,
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['local-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['local-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-daily-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['owner-attendance-stats'] });
      queryClient.invalidateQueries({ queryKey: ['owner-analytics-overview'] });
      const statusSuffix = res.isLocal ? '\nSaved locally (Pending sync)' : '';
      Alert.alert(
        'Check-In Approved',
        `Welcome, ${res.fullName} (${res.memberCode})!${statusSuffix}`
      );
      onSuccess?.(res);
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.message || 'Unable to complete check-in.';
      setErrorMessage(msg);
    },
  });

  const handleDirectCodeSubmit = () => {
    const cleanCode = directCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMessage('Please enter a valid member code.');
      return;
    }
    checkInMutation.mutate({ memberCode: cleanCode });
  };

  const handleMemberCheckIn = (member: GymMemberSummary) => {
    checkInMutation.mutate({ memberId: member.id, memberCode: member.memberCode });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Check In Member"
      subtitle="Fast operational attendance check-in"
      maxHeightRatio={0.88}
    >
      <View style={styles.container}>
        {/* Mode Selector Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.surfaceSubtle, borderRadius: radii.md }]}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'SEARCH' && [styles.tabBtnActive, { backgroundColor: colors.surface, borderRadius: radii.sm }],
            ]}
            onPress={() => {
              setActiveTab('SEARCH');
              setErrorMessage(null);
            }}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'SEARCH' }}
            accessibilityLabel="Search Member Tab"
          >
            <Users
              size={15}
              color={activeTab === 'SEARCH' ? colors.primary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                typography.captionBold,
                { color: activeTab === 'SEARCH' ? colors.primary : colors.textSecondary },
              ]}
            >
              Search Member
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'CODE' && [styles.tabBtnActive, { backgroundColor: colors.surface, borderRadius: radii.sm }],
            ]}
            onPress={() => {
              setActiveTab('CODE');
              setErrorMessage(null);
            }}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'CODE' }}
            accessibilityLabel="Enter Code Tab"
          >
            <Hash
              size={15}
              color={activeTab === 'CODE' ? colors.primary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                typography.captionBold,
                { color: activeTab === 'CODE' ? colors.primary : colors.textSecondary },
              ]}
            >
              Enter Code
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Feedback Banner */}
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

        {/* TAB 1: Search Member */}
        {activeTab === 'SEARCH' ? (
          <View style={styles.tabContent}>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
            >
              <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, typography.inputText, { color: colors.textPrimary }]}
                placeholder="Search name, phone, or code..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isSearchingMembers && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Candidate Results */}
            <View style={styles.resultsContainer}>
              {debouncedSearch.length < 2 ? (
                <View style={styles.hintBox}>
                  <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
                    Type at least 2 characters to search active gym members.
                  </Text>
                </View>
              ) : matchingMembers.length > 0 ? (
                matchingMembers.map((member) => (
                  <View
                    key={member.id}
                    style={[
                      styles.memberResultRow,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                  >
                    <Avatar name={member.fullName} size="sm" showStatusDot={member.membershipStatus === 'ACTIVE'} />
                    <View style={styles.memberInfoCol}>
                      <Text style={[typography.bodyBold, { color: colors.textPrimary }]} numberOfLines={1}>
                        {member.fullName}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {member.memberCode} {member.phone ? `• ${member.phone}` : ''}
                      </Text>
                    </View>

                    <StatusBadge status={member.membershipStatus} />

                    <TouchableOpacity
                      style={[
                        styles.quickCheckInBtn,
                        {
                          backgroundColor: colors.primary,
                          borderRadius: radii.sm,
                        },
                      ]}
                      onPress={() => handleMemberCheckIn(member)}
                      disabled={checkInMutation.isPending}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={`Check in ${member.fullName}`}
                    >
                      {checkInMutation.isPending ? (
                        <ActivityIndicator size="small" color={colors.textOnPrimary} />
                      ) : (
                        <>
                          <Check size={14} color={colors.textOnPrimary} style={{ marginRight: 4 }} />
                          <Text style={[typography.buttonSmall, { color: colors.textOnPrimary, fontSize: 12 }]}>
                            Check In
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.noResultsBox}>
                  <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                    No matching members
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 4, textAlign: 'center' }]}>
                    No member found matching "{debouncedSearch}". Check spelling or try searching by phone number.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          /* TAB 2: Direct Code Lookup */
          <View style={styles.tabContent}>
            <Text style={[typography.formLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
              Enter Member Code
            </Text>
            <View
              style={[
                styles.codeInputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: directCode.trim() ? colors.primary : colors.border,
                  borderRadius: radii.md,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.codeInput,
                  {
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="e.g. GD-1001"
                placeholderTextColor={colors.textMuted}
                value={directCode}
                onChangeText={(text) => setDirectCode(text.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleDirectCodeSubmit}
              />
            </View>

            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6, marginBottom: 20 }]}>
              Enter the member's permanent code or pass ID to record admission.
            </Text>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.md,
                },
                (!directCode.trim() || checkInMutation.isPending) && styles.submitBtnDisabled,
              ]}
              onPress={handleDirectCodeSubmit}
              disabled={!directCode.trim() || checkInMutation.isPending}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Confirm Check-In"
            >
              {checkInMutation.isPending ? (
                <ActivityIndicator color={colors.textOnPrimary} />
              ) : (
                <>
                  <UserCheck size={18} color={colors.textOnPrimary} style={{ marginRight: 8 }} />
                  <Text style={[typography.button, { color: colors.textOnPrimary }]}>
                    Confirm Check-In
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 40,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  tabContent: {
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  resultsContainer: {
    marginTop: 6,
    gap: 8,
  },
  hintBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  noResultsBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  memberResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  memberInfoCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  quickCheckInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
    minHeight: 36,
  },
  codeInputWrapper: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 54,
    justifyContent: 'center',
  },
  codeInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
});
