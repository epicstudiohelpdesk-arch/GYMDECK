/**
 * GymDeck Member Mobile - QR Check-In Pass Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, WifiOff, CheckCircle2, Sparkles, QrCode } from 'lucide-react-native';
import { useTheme } from '../../../src/theme';
import { useCheckInPass, useSubmitCheckIn, useNetworkStatus } from '../../../src/hooks';
import { QrCodeView, SkeletonLoader, PrimaryButton, ErrorBanner } from '../../../src/components';
import { AppError } from '../../../src/errors';

export default function CheckInScreen() {
  const { colors, spacing } = useTheme();
  const { isConnected } = useNetworkStatus();
  const { data: pass, isLoading, error, refetch, isRefetching } = useCheckInPass();
  const checkInMutation = useSubmitCheckIn();

  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  const handleSimulateScan = async () => {
    if (!pass) return;
    setScanSuccessMessage(null);

    try {
      const result = await checkInMutation.mutateAsync(pass.passToken);
      setScanSuccessMessage(result.message);
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setScanSuccessMessage(null), 5000);
    } catch (err) {
      // Error handled by banner
    }
  };

  if (isLoading && !pass) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
          <SkeletonLoader height={32} width={200} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={380} borderRadius={28} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg, paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerPillRow}>
            <View style={[styles.badgePill, { backgroundColor: '#E0E9FD' }]}>
              <Sparkles size={12} color="#4F75E3" />
              <Text style={[styles.badgePillText, { color: '#4F75E3' }]}>TURNSTILE GATE PASS</Text>
            </View>
          </View>
          <Text style={[styles.screenTitle, { color: '#111827' }]}>
            Floor Access Pass
          </Text>
          <Text style={[styles.screenSubtitle, { color: '#6B7280' }]}>
            Present this dynamic QR code at the turnstile or front desk to check in.
          </Text>
        </View>

        {!isConnected && (
          <View
            style={[
              styles.offlineAlert,
              {
                backgroundColor: colors.status.warningBg,
                borderColor: colors.status.warning,
              },
            ]}
          >
            <WifiOff size={18} color={colors.status.warning} />
            <Text style={[styles.offlineText, { color: '#FEF3C7' }]}>
              Internet connection required for real-time turnstile verification.
            </Text>
          </View>
        )}

        {scanSuccessMessage && (
          <View
            style={[
              styles.successAlert,
              {
                backgroundColor: colors.status.successBg,
                borderColor: colors.status.success,
              },
            ]}
          >
            <CheckCircle2 size={20} color={colors.status.success} />
            <Text style={[styles.successText, { color: '#D1FAE5' }]}>
              {scanSuccessMessage}
            </Text>
          </View>
        )}

        {pass && (
          <QrCodeView
            passToken={pass.passToken}
            memberCode={pass.memberCode}
            memberName={pass.memberName}
            gymName={pass.gymName}
            expiresAt={pass.expiresAt}
            onRefresh={refetch}
            isRefreshing={isRefetching}
          />
        )}

        {/* Development simulation helper for testing */}
        {__DEV__ && pass && (
          <View style={[styles.devBox, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[styles.devTitle, { color: colors.textMuted }]}>
              DEVELOPMENT SIMULATION
            </Text>
            <PrimaryButton
              title="Simulate Turnstile Verification"
              variant="outline"
              loading={checkInMutation.isPending}
              onPress={handleSimulateScan}
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
    marginTop: 4,
  },
  headerPillRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  offlineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 16,
    gap: 10,
  },
  offlineText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 16,
    gap: 10,
  },
  successText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  devBox: {
    padding: 18,
    borderRadius: 24,
    marginTop: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  devTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

