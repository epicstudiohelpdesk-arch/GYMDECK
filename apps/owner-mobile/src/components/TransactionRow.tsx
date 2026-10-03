/**
 * GymDeck Owner Mobile - High-Density Transaction Row
 *
 * Displays financial ledger transactions with authoritative precision:
 * Member identity, payment method, formatted amount, date/time, and status.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from '../utils/currency';
import { Receipt, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';

export interface TransactionRowItem {
  id: string;
  memberId: string;
  memberName: string;
  memberCode?: string;
  amount: number | string;
  paymentMethod: string;
  type?: string; // 'PAYMENT' | 'REFUND'
  status: string; // 'COMPLETED' | 'REFUNDED' | 'PENDING'
  paidAt: string;
  receiptNumber?: string | null;
  transactionReference?: string | null;
  notes?: string | null;
}

interface TransactionRowProps {
  item: TransactionRowItem;
  onPressReceipt: (item: TransactionRowItem) => void;
  onPressMember?: (memberId: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = React.memo(({
  item,
  onPressReceipt,
  onPressMember,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  const isRefund = item.type === 'REFUND' || Number(item.amount) < 0;
  const absAmount = Math.abs(Number(item.amount));

  // Format human-friendly timestamp
  const dateObj = new Date(item.paidAt);
  const isToday =
    dateObj.toDateString() === new Date().toDateString();
  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const formattedDate = isToday ? `Today, ${timeStr}` : `${dateStr}, ${timeStr}`;

  const initial = (item.memberName || 'M').charAt(0).toUpperCase();

  const accessibilityLabel = `${isRefund ? 'Refund' : 'Payment'} of ${formatCurrency(absAmount)} via ${item.paymentMethod} from ${item.memberName}, status ${item.status}, ${formattedDate}. Tap to view receipt.`;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      onPress={() => onPressReceipt(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {/* 1. Avatar / Direction Box */}
      <TouchableOpacity
        style={[
          styles.avatarBox,
          {
            backgroundColor: isRefund ? colors.dangerBg : colors.primarySoft,
            borderColor: isRefund ? colors.dangerBorder : colors.primaryBorder,
            borderRadius: radii.md,
          },
        ]}
        onPress={() => onPressMember ? onPressMember(item.memberId) : onPressReceipt(item)}
        activeOpacity={0.8}
        accessibilityLabel={`View profile of ${item.memberName}`}
      >
        <Text
          style={[
            typography.sectionTitle,
            { color: isRefund ? colors.danger : colors.primary },
          ]}
        >
          {initial}
        </Text>
        <View
          style={[
            styles.directionDot,
            {
              backgroundColor: isRefund ? colors.danger : colors.success,
              borderColor: colors.surface,
            },
          ]}
        >
          {isRefund ? (
            <ArrowDownLeft size={8} color="#FFFFFF" />
          ) : (
            <ArrowUpRight size={8} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>

      {/* 2. Member & Context Column */}
      <View style={styles.centerCol}>
        <View style={styles.nameRow}>
          <Text
            style={[typography.cardTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.memberName}
          </Text>
          {item.memberCode && (
            <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
              ({item.memberCode})
            </Text>
          )}
        </View>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.methodPill,
              { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
            ]}
          >
            <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
              {item.paymentMethod.toUpperCase()}
            </Text>
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 6 }]}>
            • {formattedDate}
          </Text>
        </View>

        {item.notes && (
          <Text
            style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}
            numberOfLines={1}
          >
            {item.notes}
          </Text>
        )}
      </View>

      {/* 3. Amount & Status Column */}
      <View style={styles.rightCol}>
        <Text
          style={[
            typography.cardTitle,
            {
              color: isRefund ? colors.danger : colors.textPrimary,
              fontWeight: '800',
              textAlign: 'right',
            },
          ]}
        >
          {isRefund ? `-${formatCurrency(absAmount)}` : `+${formatCurrency(absAmount)}`}
        </Text>

        <View style={{ marginTop: 4 }}>
          <StatusBadge status={item.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  directionDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  methodPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
