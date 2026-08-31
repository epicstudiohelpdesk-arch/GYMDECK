/**
 * GymDeck Member Mobile - Reset Password Screen
 */

import React, { useState } from 'react';
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
import { Lock, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store';
import { authService } from '../../src/services/api';
import {
  AuthHeader,
  OtpInputField,
  TextInputField,
  PrimaryButton,
  ErrorBanner,
} from '../../src/components';
import { ResetPasswordSchema } from '../../src/validation';
import { AppError } from '../../src/errors';
import { useNetworkStatus } from '../../src/hooks';

export default function ResetPasswordScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const pendingVerificationEmail = useAuthStore(
    (state) => state.pendingVerificationEmail
  );
  const { isConnected } = useNetworkStatus();

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | AppError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const email = pendingVerificationEmail || '';

  const handleResetPassword = async () => {
    setGeneralError(null);
    setErrors({});

    if (!isConnected) {
      setGeneralError(AppError.network('Internet connection is required to reset your password.'));
      return;
    }

    const validationResult = ResetPasswordSchema.safeParse({
      otp,
      password,
      confirmPassword,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({
        email,
        otp: validationResult.data.otp,
        password: validationResult.data.password,
        confirmPassword: validationResult.data.confirmPassword,
      });

      setIsSuccess(true);
    } catch (err) {
      setGeneralError(AppError.fromUnknown(err));
    } finally {
      setLoading(false);
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
          title="Set New Password"
          subtitle={
            email
              ? `Enter the 6-digit recovery code sent to ${email} along with your new password.`
              : 'Enter your 6-digit recovery code and new password.'
          }
          showBack={true}
        />

        <ErrorBanner error={generalError} onDismiss={() => setGeneralError(null)} />

        {isSuccess ? (
          <View style={styles.successCard}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.status.successBg },
              ]}
            >
              <CheckCircle size={32} color={colors.status.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              Password Updated
            </Text>
            <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
              Your member account password has been successfully reset. You can now sign in with your new credentials.
            </Text>

            <PrimaryButton
              title="Sign In Now"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: 24 }}
            />
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              6-Digit Recovery Code
            </Text>

            <OtpInputField
              value={otp}
              onChange={(val) => {
                setOtp(val);
                if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
              }}
              hasError={!!errors.otp}
              disabled={loading}
            />
            {errors.otp ? (
              <Text style={[styles.fieldError, { color: colors.status.error }]}>
                {errors.otp}
              </Text>
            ) : null}

            <TextInputField
              label="New Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
              }}
              isPassword
              error={errors.password}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
              hint="Min 8 chars, 1 uppercase, 1 number, 1 special"
            />

            <TextInputField
              label="Confirm New Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              isPassword
              error={errors.confirmPassword}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            <PrimaryButton
              title="Update Password"
              onPress={handleResetPassword}
              loading={loading}
              disabled={loading}
              style={{ marginTop: 16 }}
            />
          </View>
        )}

        <View style={[styles.footerRow, { marginTop: spacing.xxl }]}>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Return to sign in"
          >
            <Text style={[styles.footerLink, { color: colors.brand.primary }]}>
              Back to Sign In
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
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldError: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
    textAlign: 'center',
  },
  successCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerRow: {
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
