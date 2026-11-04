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
          backgroundColor: '#FFFFFF',
          borderColor: '#E5E7EB',
          borderRadius: 28,
          padding: spacing.xl,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.gymTitle, { color: '#111827' }]}>{gymName}</Text>
          <Text style={[styles.memberCodeText, { color: '#4F75E3' }]}>
            PASS ID: {memberCode}
          </Text>
        </View>

        <View style={[styles.activePill, { backgroundColor: '#ECFDF5' }]}>
          <ShieldCheck size={12} color="#10B981" />
          <Text style={[styles.activeText, { color: '#10B981' }]}>VERIFIED</Text>
        </View>
      </View>

      {/* High-contrast QR Container */}
      <View style={[styles.qrContainer, { backgroundColor: '#F8FAFC', borderRadius: 20, borderColor: '#E5E7EB', borderWidth: 1 }]}>
        <QrCode size={180} color="#111827" strokeWidth={1.8} />
        <Text style={styles.qrTokenText}>{passToken.slice(0, 18)}...</Text>
      </View>

      <Text style={[styles.memberNameText, { color: '#111827' }]}>
        {memberName}
      </Text>
      <Text style={[styles.instructionsText, { color: '#6B7280' }]}>
        Hold pass 4–6 inches from reception turnstile or counter scanner
      </Text>

      <View style={[styles.footerRow, { borderTopColor: '#F3F4F6' }]}>
        <View style={styles.timerWrapper}>
          <Text style={[styles.timerLabel, { color: '#9CA3AF' }]}>Pass expires in:</Text>
          <Text
            style={[
              styles.timerCount,
              { color: isExpiring ? '#EF4444' : '#111827' },
            ]}
          >
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            disabled={isRefreshing}
            style={[styles.refreshButton, { backgroundColor: '#E0E9FD' }]}
            accessibilityRole="button"
            accessibilityLabel="Refresh check-in pass"
          >
            <RefreshCw size={14} color="#4F75E3" />
            <Text style={[styles.refreshText, { color: '#4F75E3' }]}>
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  gymTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  memberCodeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
  },
  instructionsText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 260,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  timerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  timerCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default QrCodeView;
