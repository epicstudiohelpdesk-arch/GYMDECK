/**
 * GymDeck Member Mobile - QR Code Pass Visualizer Component
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QrCode, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../theme';

export interface QrCodeViewProps {
  passToken: string;
  memberCode: string;
  memberName: string;
  gymName: string;
  expiresAt: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const QrCodeView: React.FC<QrCodeViewProps> = ({
  passToken,
  memberCode,
  memberName,
  gymName,
  expiresAt,
  onRefresh,
  isRefreshing = false,
}) => {
  const { colors, radii, spacing } = useTheme();
  const [secondsRemaining, setSecondsRemaining] = useState(300);

  useEffect(() => {
    const expiryTime = new Date(expiresAt).getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setSecondsRemaining(diff);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isExpiring = secondsRemaining < 60;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.xl,
          padding: spacing.xl,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.gymTitle, { color: colors.textPrimary }]}>{gymName}</Text>
          <Text style={[styles.memberCodeText, { color: colors.brand.primary }]}>
            PASS ID: {memberCode}
          </Text>
        </View>

        <View style={[styles.activePill, { backgroundColor: colors.status.successBg }]}>
          <ShieldCheck size={12} color={colors.status.success} />
          <Text style={[styles.activeText, { color: colors.status.success }]}>VERIFIED</Text>
        </View>
      </View>

      {/* High-contrast QR Container */}
      <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderRadius: radii.lg }]}>
        <QrCode size={180} color="#090A0F" strokeWidth={2} />
        <Text style={styles.qrTokenText}>{passToken.slice(0, 18)}...</Text>
      </View>

      <Text style={[styles.memberNameText, { color: colors.textPrimary }]}>
        {memberName}
      </Text>
      <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
        Hold pass 4–6 inches from reception turnstile or counter scanner
      </Text>

      <View style={[styles.footerRow, { borderTopColor: colors.borderSubtle }]}>
        <View style={styles.timerWrapper}>
          <Text style={[styles.timerLabel, { color: colors.textMuted }]}>Pass expires in:</Text>
          <Text
            style={[
              styles.timerCount,
              { color: isExpiring ? colors.status.error : colors.textPrimary },
            ]}
          >
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            disabled={isRefreshing}
            style={[styles.refreshButton, { backgroundColor: colors.surfaceSubtle }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh check-in pass"
          >
            <RefreshCw size={16} color={colors.brand.primary} />
            <Text style={[styles.refreshText, { color: colors.brand.primary }]}>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  gymTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  memberCodeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  qrContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  qrTokenText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  memberNameText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  instructionsText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 240,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  timerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    fontSize: 12,
  },
  timerCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default QrCodeView;
