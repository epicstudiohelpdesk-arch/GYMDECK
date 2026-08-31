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
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { ShieldCheck, WifiOff, CheckCircle2 } from 'lucide-react-native';
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ padding: spacing.xl, alignItems: 'center' }}>
          <SkeletonLoader height={32} width={200} style={{ marginBottom: 20 }} />
          <SkeletonLoader height={380} borderRadius={24} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
            Floor Access Pass
          </Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
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
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 24,
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
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  offlineText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  devBox: {
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  devTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

