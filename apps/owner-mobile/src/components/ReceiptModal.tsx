/**
 * GymDeck Owner Mobile - Official Digital Receipt Modal
 *
 * Provides a verifiable financial audit receipt:
 * Gym entity, receipt number, member context, line items, transaction reference, and verification stamp.
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ReceiptData } from '../types';
import { useTheme } from '../theme';
import { formatCurrency } from '../utils/currency';
import { Receipt, X, CheckCircle, ShieldCheck } from 'lucide-react-native';

interface ReceiptModalProps {
  visible: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ visible, receipt, onClose }) => {
  const { colors, typography, radii, shadows } = useTheme();

  if (!receipt) return null;

  const formattedDate = new Date(receipt.payment.paidAt).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = new Date(receipt.payment.paidAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(15, 23, 42, 0.65)' }]}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radii.xl,
            },
            shadows.high,
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.md },
                ]}
              >
                <Receipt size={20} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={[typography.sectionTitle, { color: colors.textPrimary }]}>
                  Official Receipt
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {receipt.receiptNumber}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceSubtle, borderRadius: radii.full }]}
              accessibilityRole="button"
              accessibilityLabel="Close receipt"
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
          >
            {/* Gym Header Branding */}
            <View style={styles.gymHeader}>
              <Text style={[typography.cardTitle, { color: colors.textPrimary, textAlign: 'center', fontSize: 18 }]}>
                {receipt.gym.name}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Branch Code: {receipt.gym.code}
              </Text>
              <View
                style={[
                  styles.receiptBadge,
                  { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderRadius: radii.xs },
                ]}
              >
                <Text style={[typography.captionBold, { color: colors.primary, letterSpacing: 0.5 }]}>
                  {receipt.receiptNumber}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Billed To Section */}
            <View style={styles.section}>
              <Text style={[typography.captionBold, { color: colors.textMuted, letterSpacing: 0.8, marginBottom: 4 }]}>
                BILLED TO
              </Text>
              <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                {receipt.member.fullName}
              </Text>
              <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: 2 }]}>
                Member Code: {receipt.member.memberCode}
              </Text>
              <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: 1 }]}>
                Phone: {receipt.member.phone}
              </Text>
              {receipt.member.email && (
                <Text style={[typography.bodySecondary, { color: colors.textSecondary, marginTop: 1 }]}>
                  Email: {receipt.member.email}
                </Text>
              )}
            </View>

            <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

            {/* Membership Details (If applicable) */}
            {receipt.membership && (
              <>
                <View style={styles.section}>
                  <Text style={[typography.captionBold, { color: colors.textMuted, letterSpacing: 0.8, marginBottom: 6 }]}>
                    SUBSCRIPTION PLAN
                  </Text>
                  <View style={styles.row}>
                    <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                      {receipt.membership.planName}
                    </Text>
                    <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                      {receipt.membership.durationDays} Days
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                    Period: {new Date(receipt.membership.startDate).toLocaleDateString()} —{' '}
                    {new Date(receipt.membership.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              </>
            )}

            {/* Payment Summary Section */}
            <View style={styles.section}>
              <Text style={[typography.captionBold, { color: colors.textMuted, letterSpacing: 0.8, marginBottom: 8 }]}>
                PAYMENT DETAILS
              </Text>
              <View style={styles.row}>
                <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>
                  Payment Method
                </Text>
                <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                  {receipt.payment.paymentMethod}
                </Text>
              </View>

              {receipt.payment.transactionReference && (
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>
                    Reference #
                  </Text>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>
                    {receipt.payment.transactionReference}
                  </Text>
                </View>
              )}

              <View style={[styles.row, { marginTop: 6 }]}>
                <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>
                  Date & Time
                </Text>
                <Text style={[typography.body, { color: colors.textPrimary }]}>
                  {formattedDate}, {formattedTime}
                </Text>
              </View>

              <View style={[styles.row, { marginTop: 6 }]}>
                <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>
                  Status
                </Text>
                <Text style={[typography.captionBold, { color: colors.success }]}>
                  {receipt.payment.status}
                </Text>
              </View>

              {receipt.notes && (
                <View style={[styles.row, { marginTop: 6 }]}>
                  <Text style={[typography.bodySecondary, { color: colors.textSecondary }]}>
                    Notes
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, textAlign: 'right' }]}>
                    {receipt.notes}
                  </Text>
                </View>
              )}

              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <Text style={[typography.sectionTitle, { color: colors.textPrimary }]}>
                  TOTAL AMOUNT PAID
                </Text>
                <Text style={[styles.totalAmount, { color: colors.primary }]}>
                  {formatCurrency(Number(receipt.payment.amount))}
                </Text>
              </View>
            </View>

            {/* Cloud Ledger Verified Stamp */}
            <View
              style={[
                styles.securityBox,
                {
                  backgroundColor: colors.successBg,
                  borderColor: colors.successBorder,
                  borderRadius: radii.md,
                },
              ]}
            >
              <ShieldCheck size={18} color={colors.success} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.captionBold, { color: colors.successText }]}>
                  Verified Transaction
                </Text>
                <Text style={[typography.caption, { color: colors.successText, marginTop: 1 }]}>
                  Recorded in GymDeck Cloud Ledger
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.closeActionBtn,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                borderRadius: radii.md,
              },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Close receipt view"
          >
            <CheckCircle size={18} color={colors.textOnPrimary} style={{ marginRight: 6 }} />
            <Text style={[typography.button, { color: colors.textOnPrimary }]}>
              Close Receipt
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    maxHeight: '90%',
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingVertical: 12,
  },
  gymHeader: {
    alignItems: 'center',
    marginVertical: 4,
  },
  receiptBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    marginTop: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  section: {
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  closeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    marginTop: 8,
  },
});
