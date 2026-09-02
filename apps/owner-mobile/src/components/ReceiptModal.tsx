/**
 * GymDeck Owner Mobile - Formal Receipt Modal
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ReceiptData } from '../types';
import { Receipt, X, CheckCircle, ShieldCheck } from 'lucide-react-native';

interface ReceiptModalProps {
  visible: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ visible, receipt, onClose }) => {
  if (!receipt) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Receipt size={22} color="#EAB308" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Official Receipt</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Gym Header */}
            <View style={styles.gymHeader}>
              <Text style={styles.gymName}>{receipt.gym.name}</Text>
              <Text style={styles.gymCode}>Branch Code: {receipt.gym.code}</Text>
              <View style={styles.receiptBadge}>
                <Text style={styles.receiptBadgeText}>{receipt.receiptNumber}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Member Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>BILLED TO</Text>
              <Text style={styles.memberName}>{receipt.member.fullName}</Text>
              <Text style={styles.memberDetail}>Member Code: {receipt.member.memberCode}</Text>
              <Text style={styles.memberDetail}>Phone: {receipt.member.phone}</Text>
            </View>

            <View style={styles.divider} />

            {/* Membership Details */}
            {receipt.membership && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>MEMBERSHIP SUBSCRIPTION</Text>
                  <View style={styles.row}>
                    <Text style={styles.itemName}>{receipt.membership.planName}</Text>
                    <Text style={styles.itemVal}>{receipt.membership.durationDays} Days</Text>
                  </View>
                  <Text style={styles.periodText}>
                    Valid: {new Date(receipt.membership.startDate).toLocaleDateString()} —{' '}
                    {new Date(receipt.membership.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.divider} />
              </>
            )}

            {/* Payment Details */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PAYMENT SUMMARY</Text>
              <View style={styles.row}>
                <Text style={styles.payLabel}>Payment Method</Text>
                <Text style={styles.payVal}>{receipt.payment.paymentMethod}</Text>
              </View>

              {receipt.payment.transactionReference && (
                <View style={styles.row}>
                  <Text style={styles.payLabel}>Transaction Ref</Text>
                  <Text style={styles.payVal}>{receipt.payment.transactionReference}</Text>
                </View>
              )}

              <View style={styles.row}>
                <Text style={styles.payLabel}>Payment Date</Text>
                <Text style={styles.payVal}>
                  {new Date(receipt.payment.paidAt).toLocaleDateString()}
                </Text>
              </View>

              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL AMOUNT PAID</Text>
                <Text style={styles.totalVal}>${Number(receipt.payment.amount).toFixed(2)}</Text>
              </View>
            </View>

            {/* Verification Footer */}
            <View style={styles.securityBox}>
              <ShieldCheck size={16} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.securityText}>Verified & Recorded in Cloud Financial Ledger</Text>
            </View>
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <CheckCircle size={18} color="#0A0D14" style={{ marginRight: 6 }} />
            <Text style={styles.doneBtnText}>Close Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#131823',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  content: {
    paddingBottom: 16,
  },
  gymHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  gymName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  gymCode: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  receiptBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#EAB308',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  receiptBadgeText: {
    color: '#EAB308',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  section: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  memberDetail: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemVal: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  periodText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  payLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  payVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  securityText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAB308',
    borderRadius: 14,
    height: 48,
    marginTop: 10,
  },
  doneBtnText: {
    color: '#0A0D14',
    fontSize: 15,
    fontWeight: '700',
  },
});
