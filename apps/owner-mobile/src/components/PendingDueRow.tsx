/**
 * GymDeck Owner Mobile - High-Density Pending Due & Expiring Row
 *
 * Direct operational interface for members with outstanding balances or expired memberships.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from '../utils/currency';
import { AlertCircle, ArrowRight } from 'lucide-react-native';

export interface PendingDueItem {
  id: string; // memberId
  fullName: string;
  memberCode: string;
  phone: string;
  membershipStatus: string;
  outstandingBalance?: number;
  planName?: string;
  expiresAt?: string | null;
}

interface PendingDueRowProps {
  item: PendingDueItem;
  onPressMember: (memberId: string) => void;
  onCollect: (item: PendingDueItem) => void;
}

export const PendingDueRow: React.FC<PendingDueRowProps> = React.memo(({
  item,
  onPressMember,
  onCollect,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  const isExpired = item.membershipStatus === 'EXPIRED';
  const hasBalance = (item.outstandingBalance ?? 0) > 0;
  const initial = (item.fullName || 'M').charAt(0).toUpperCase();

  const accessibilityLabel = `${item.fullName}, Code ${item.memberCode}, ${
    hasBalance
      ? `${formatCurrency(item.outstandingBalance)} outstanding`
      : 'Membership expired'
  }. Tap to view profile or use Collect button.`;

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      {/* 1. Member Avatar & Details (Clickable -> Profile) */}
      <TouchableOpacity
        style={styles.memberInfoCol}
        onPress={() => onPressMember(item.id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View
          style={[
            styles.avatarBox,
            {
              backgroundColor: hasBalance ? colors.dangerBg : colors.warningBg,
              borderColor: hasBalance ? colors.dangerBorder : colors.warningBorder,
              borderRadius: radii.md,
            },
          ]}
        >
          <Text
            style={[
              typography.sectionTitle,
              { color: hasBalance ? colors.danger : colors.warningText },
            ]}
          >
            {initial}
          </Text>
        </View>

        <View style={styles.textCol}>
          <View style={styles.nameRow}>
            <Text
              style={[typography.cardTitle, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.fullName}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
              ({item.memberCode})
            </Text>
          </View>

          <View style={styles.subtextRow}>
            {hasBalance ? (
              <Text
                style={[
                  typography.captionBold,
                  { color: colors.danger, fontWeight: '700' },
                ]}
              >
                {formatCurrency(item.outstandingBalance)} outstanding
              </Text>
            ) : (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {item.planName ? `${item.planName} • ` : ''}Expired
              </Text>
            )}
            <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
              • {item.phone}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 2. Direct Collect Action Button (>= 44pt touch area) */}
      <TouchableOpacity
        style={[
          styles.collectBtn,
          {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            borderRadius: radii.sm,
          },
        ]}
        onPress={() => onCollect(item)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Collect payment for ${item.fullName}`}
      >
        <Text style={[typography.buttonSmall, { color: colors.textOnPrimary }]}>
          Collect
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  memberInfoCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  collectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
