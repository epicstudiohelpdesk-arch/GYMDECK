/**
 * GymDeck Member Mobile - Payment Attempt & UTR Submission Modal
 * 
 * Provides an authoritative, server-locked direct settlement workflow:
 * 1. Server-locked dues amount
 * 2. 100% direct bank-to-bank / UPI rail (zero custody)
 * 3. UPI Intent launcher (GPay, PhonePe, Paytm, BHIM)
 * 4. UTR reference submission for manual gym staff verification
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Clipboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  ShieldCheck,
  Smartphone,
  Landmark,
  Copy,
  Check,
  AlertCircle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
} from 'lucide-react-native';
import { useTheme } from '../../theme';
import { memberService } from '../../services/api/memberService';
import { PaymentAttemptResponse } from '../../services/api/types';

export interface PaymentAttemptModalProps {
  visible: boolean;
  onClose: () => void;
  invoiceId?: string;
  amount?: number;
  planName?: string;
  onSuccess?: () => void;
}

export const PaymentAttemptModal: React.FC<PaymentAttemptModalProps> = ({
  visible,
  onClose,
  invoiceId,
  amount,
  planName,
  onSuccess,
}) => {
  const { colors, radii, spacing } = useTheme();

  const [loading, setLoading] = useState(false);
  const [attemptData, setAttemptData] = useState<PaymentAttemptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setAttemptData(null);
      setError(null);
      setUtr('');
      setSubmitted(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const initAttempt = async () => {
      try {
        let effectiveInvoiceId = invoiceId;
        if (!effectiveInvoiceId) {
          const summary = await memberService.getDuesSummary();
          const firstOpen = summary.invoices?.find((i) => i.balanceMinor > 0);
          if (firstOpen) {
            effectiveInvoiceId = firstOpen.id;
          }
        }

        if (!effectiveInvoiceId) {
          throw new Error('No open invoice found for this payment.');
        }

        const amountMinor = amount ? Math.round(amount * 100) : undefined;
        const res = await memberService.createPaymentAttempt(effectiveInvoiceId, amountMinor, 'DIRECT_UPI');
        if (isMounted) {
          setAttemptData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Unable to initiate direct payment. Please try again or pay at the desk.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAttempt();

    return () => {
      isMounted = false;
    };
  }, [visible, invoiceId, amount]);

  const handleCopy = (text: string, key: string) => {
    Clipboard.setString(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLaunchUpi = async () => {
    if (!attemptData?.upi?.uri) {
      Alert.alert('Unavailable', 'UPI intent URL is not configured for this gym.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(attemptData.upi.uri);
      if (supported) {
        await Linking.openURL(attemptData.upi.uri);
      } else {
        // Fallback to general upi schema
        await Linking.openURL(attemptData.upi.uri);
      }
    } catch {
      Alert.alert(
        'UPI App Not Found',
        'Could not open UPI app. You can copy the UPI VPA and transfer manually via Google Pay, PhonePe, or Paytm.'
      );
    }
  };

  const handleSubmitUtr = async () => {
    const trimmedUtr = utr.trim();
    if (!trimmedUtr || trimmedUtr.length < 6) {
      Alert.alert('Invalid UTR', 'Please enter a valid 6-20 digit transaction reference number (UTR).');
      return;
    }
    if (!attemptData?.attempt?.id) return;

    setSubmitting(true);
    try {
      await memberService.submitPaymentProof(
        attemptData.attempt.id,
        trimmedUtr,
        attemptData.attempt.amountMinor
      );
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Failed to submit payment reference. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedAmount = attemptData
    ? (attemptData.attempt.amountMinor / 100).toFixed(2)
    : amount !== undefined
    ? amount.toFixed(2)
    : '0.00';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderRadius: radii.xl }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pay Dues Online</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {planName || 'Direct Gym Transfer'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Generating secure payment attempt...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <AlertCircle size={32} color={colors.status.error} />
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.actionButton, { backgroundColor: colors.brand.primary, marginTop: 16 }]}
              >
                <Text style={styles.actionButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : submitted ? (
            <View style={styles.submittedContainer}>
              <View style={[styles.successIconWrapper, { backgroundColor: colors.status.successBg }]}>
                <CheckCircle2 size={40} color={colors.status.success} />
              </View>
              <Text style={[styles.submittedTitle, { color: colors.textPrimary }]}>
                Payment Reference Submitted
              </Text>
              <Text style={[styles.submittedSubtitle, { color: colors.textSecondary }]}>
                UTR: <Text style={{ fontWeight: '700' }}>{utr.trim()}</Text>
              </Text>
              <View style={[styles.noticeBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                  Your payment is currently under verification. Gym staff will verify the credit against their bank statement and activate your membership shortly.
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.actionButton, { backgroundColor: colors.brand.primary, marginTop: 20 }]}
              >
                <Text style={styles.actionButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Statutory Non-Custodial Notice */}
              <View style={[styles.disclaimerPill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <ShieldCheck size={14} color="#059669" />
                <Text style={styles.disclaimerText}>
                  100% Direct Transfer • Funds deposit straight to gym's bank account. GymDeck holds ₹0.00.
                </Text>
              </View>

              {/* Server-locked Amount Card */}
              <View style={[styles.amountCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>PAYABLE AMOUNT</Text>
                <Text style={[styles.amountValue, { color: colors.textPrimary }]}>₹{formattedAmount}</Text>
                <Text style={[styles.amountSub, { color: colors.textMuted }]}>Authoritative Server-Locked Fee</Text>
              </View>

              {/* UPI Option */}
              {attemptData?.upi && (
                <View style={[styles.sectionCard, { borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <Smartphone size={16} color={colors.brand.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pay via UPI Intent</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleLaunchUpi}
                    style={[styles.upiButton, { backgroundColor: colors.brand.primary }]}
                  >
                    <Text style={styles.upiButtonText}>Open UPI App (GPay, PhonePe, Paytm)</Text>
                    <ArrowUpRight size={16} color="#FFF" />
                  </TouchableOpacity>

                  {attemptData.upi.vpa && (
                    <View style={styles.copyRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.copyLabel, { color: colors.textMuted }]}>Merchant UPI VPA</Text>
                        <Text style={[styles.copyValue, { color: colors.textPrimary }]}>
                          {attemptData.upi.vpa}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCopy(attemptData!.upi!.vpa, 'vpa')}
                        style={styles.copyButton}
                      >
                        {copiedKey === 'vpa' ? (
                          <Check size={16} color={colors.status.success} />
                        ) : (
                          <Copy size={16} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Bank Transfer Option */}
              {attemptData?.bankAccount && (
                <View style={[styles.sectionCard, { borderColor: colors.border }]}>
                  <View style={styles.sectionHeader}>
                    <Landmark size={16} color={colors.brand.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Direct Bank Transfer (IMPS/NEFT)</Text>
                  </View>

                  <View style={styles.bankDetailRow}>
                    <Text style={[styles.bankLabel, { color: colors.textMuted }]}>Bank Name</Text>
                    <Text style={[styles.bankVal, { color: colors.textPrimary }]}>{attemptData.bankAccount.bankName}</Text>
                  </View>

                  <View style={styles.bankDetailRow}>
                    <Text style={[styles.bankLabel, { color: colors.textMuted }]}>Beneficiary</Text>
                    <Text style={[styles.bankVal, { color: colors.textPrimary }]}>{attemptData.bankAccount.beneficiaryName}</Text>
                  </View>

                  {attemptData.bankAccount.accountNumberMasked && (
                    <View style={styles.bankDetailRow}>
                      <Text style={[styles.bankLabel, { color: colors.textMuted }]}>Account No.</Text>
                      <Text style={[styles.bankVal, { color: colors.textPrimary }]}>{attemptData.bankAccount.accountNumberMasked}</Text>
                    </View>
                  )}

                  {attemptData.bankAccount.ifscCode && (
                    <View style={styles.bankDetailRow}>
                      <Text style={[styles.bankLabel, { color: colors.textMuted }]}>IFSC Code</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.bankVal, { color: colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }]}>
                          {attemptData.bankAccount.ifscCode}
                        </Text>
                        <TouchableOpacity onPress={() => handleCopy(attemptData!.bankAccount!.ifscCode!, 'ifsc')}>
                          {copiedKey === 'ifsc' ? <Check size={14} color={colors.status.success} /> : <Copy size={14} color={colors.textSecondary} />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Step 2: UTR Reference Submission */}
              <View style={[styles.utrCard, { backgroundColor: '#F8FAFC', borderColor: colors.border }]}>
                <Text style={[styles.utrHeader, { color: colors.textPrimary }]}>
                  Confirm Payment (Submit UTR / Ref)
                </Text>
                <Text style={[styles.utrHelper, { color: colors.textSecondary }]}>
                  After completing the transfer in your UPI or banking app, enter the 12-digit transaction UTR number below.
                </Text>

                <TextInput
                  value={utr}
                  onChangeText={setUtr}
                  placeholder="e.g. 431289104821"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  style={[styles.utrInput, { borderColor: colors.border, backgroundColor: '#FFFFFF', color: colors.textPrimary }]}
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={submitting || !utr.trim()}
                  onPress={handleSubmitUtr}
                  style={[
                    styles.submitUtrButton,
                    {
                      backgroundColor: !utr.trim() || submitting ? '#94A3B8' : '#0F172A',
                    },
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} color="#FFF" />
                      <Text style={styles.submitUtrButtonText}>Submit Reference for Verification</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 30,
    gap: 12,
  },
  disclaimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  amountCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  amountSub: {
    fontSize: 11,
  },
  sectionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  upiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  upiButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  copyLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  copyValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  copyButton: {
    padding: 6,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    fontSize: 11,
  },
  bankVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  utrCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  utrHeader: {
    fontSize: 13,
    fontWeight: '800',
  },
  utrHelper: {
    fontSize: 11,
    lineHeight: 15,
  },
  utrInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  submitUtrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  submitUtrButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  submittedContainer: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  successIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  submittedTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  submittedSubtitle: {
    fontSize: 13,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PaymentAttemptModal;
