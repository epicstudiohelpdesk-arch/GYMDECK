/**
 * GymDeck Member Mobile - Email OTP Verification Screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MailCheck, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store';
import { authService } from '../../src/services/api';
import { AuthHeader, OtpInputField, PrimaryButton, ErrorBanner } from '../../src/components';
import { AppError } from '../../src/errors';
import { useNetworkStatus } from '../../src/hooks';

export default function VerifyEmailScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { setSession, pendingVerificationEmail } = useAuthStore();
  const { isConnected } = useNetworkStatus();

  const [otp, setOtp] = useState('');
  const [generalError, setGeneralError] = useState<string | AppError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const email = pendingVerificationEmail || 'your email address';

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleVerify = async () => {
    setGeneralError(null);
    setSuccessMessage(null);

    if (otp.length !== 6) {
      setGeneralError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!isConnected) {
      setGeneralError(AppError.network('Internet connection is required to verify your email.'));
      return;
    }

    setLoading(true);

    try {
      const { user, tokens } = await authService.verifyEmail(
        pendingVerificationEmail || '',
        otp
      );

      await setSession(user, tokens);
      router.replace('/(onboarding)/welcome');
    } catch (err) {
      setGeneralError(AppError.fromUnknown(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || resending) return;

    setGeneralError(null);
    setSuccessMessage(null);

    if (!isConnected) {
      setGeneralError(AppError.network('Internet connection is required to resend verification code.'));
      return;
    }

    setResending(true);

    try {
      await authService.resendOtp(pendingVerificationEmail || '');
      setSuccessMessage('A new 6-digit verification code has been dispatched to your email.');
      setCooldown(60);
    } catch (err) {
      setGeneralError(AppError.fromUnknown(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader
          title="Verify Email"
          subtitle={`We sent a 6-digit verification code to:\n${email}`}
          showBack={true}
        />

        <ErrorBanner error={generalError} onDismiss={() => setGeneralError(null)} />

        {successMessage && (
          <View
            style={[
              styles.successBanner,
              {
                backgroundColor: colors.status.successBg,
                borderColor: colors.status.success,
              },
            ]}
          >
            <MailCheck size={18} color={colors.status.success} />
            <Text style={[styles.successText, { color: '#D1FAE5' }]}>{successMessage}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            Enter 6-Digit Code
          </Text>

          <OtpInputField
            value={otp}
            onChange={(val) => {
              setOtp(val);
              if (generalError) setGeneralError(null);
            }}
            hasError={!!generalError}
            disabled={loading}
          />

          <PrimaryButton
            title="Verify & Continue"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || otp.length < 6}
            style={{ marginTop: 16 }}
          />

          <View style={styles.resendContainer}>
            {cooldown > 0 ? (
              <Text style={[styles.cooldownText, { color: colors.textMuted }]}>
                Resend code in <Text style={{ fontWeight: '700' }}>{cooldown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendOtp}
                style={styles.resendButton}
                disabled={resending}
                accessibilityRole="button"
                accessibilityLabel="Resend verification code"
              >
                <RotateCcw size={16} color={colors.brand.primary} />
                <Text style={[styles.resendText, { color: colors.brand.primary }]}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.footerRow, { marginTop: spacing.xxl }]}>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Return to sign in"
          >
            <Text style={[styles.footerLink, { color: colors.textSecondary }]}>
              Wrong email address? <Text style={{ color: colors.brand.primary }}>Sign in instead</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    width: '100%',
  },
  successText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  cooldownText: {
    fontSize: 13,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerRow: {
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 14,
  },
});
