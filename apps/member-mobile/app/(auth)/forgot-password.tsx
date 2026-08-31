/**
 * GymDeck Member Mobile - Forgot Password Screen
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
import { Mail, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store';
import { authService } from '../../src/services/api';
import { AuthHeader, TextInputField, PrimaryButton, ErrorBanner } from '../../src/components';
import { ForgotPasswordSchema } from '../../src/validation';
import { AppError } from '../../src/errors';
import { useNetworkStatus } from '../../src/hooks';

export default function ForgotPasswordScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const setPendingVerificationEmail = useAuthStore(
    (state) => state.setPendingVerificationEmail
  );
  const { isConnected } = useNetworkStatus();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | AppError | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    setError(null);
    setGeneralError(null);

    if (!isConnected) {
      setGeneralError(AppError.network('Internet connection is required to reset your password.'));
      return;
    }

    const validationResult = ForgotPasswordSchema.safeParse({ email });
    if (!validationResult.success) {
      setError(validationResult.error.errors[0]?.message || 'Please enter a valid email');
      return;
    }

    setLoading(true);

    try {
      await authService.forgotPassword({ email: validationResult.data.email });
      setPendingVerificationEmail(validationResult.data.email);
      setSubmitted(true);
    } catch (err) {
      // Return safe generic response to prevent account enumeration
      setPendingVerificationEmail(validationResult.data.email);
      setSubmitted(true);
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
          title="Reset Password"
          subtitle="Enter the email associated with your GymDeck member account to receive recovery instructions."
          showBack={true}
        />

        <ErrorBanner error={generalError} onDismiss={() => setGeneralError(null)} />

        {submitted ? (
          <View style={styles.confirmationCard}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.status.successBg },
              ]}
            >
              <CheckCircle2 size={32} color={colors.status.success} />
            </View>

            <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>
              Check Your Inbox
            </Text>
            <Text style={[styles.confirmDescription, { color: colors.textSecondary }]}>
              If an account is associated with{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{email}</Text>,
              a 6-digit password reset code has been sent.
            </Text>

            <PrimaryButton
              title="Enter Reset Code"
              onPress={() => router.push('/(auth)/reset-password')}
              style={{ marginTop: 24 }}
            />
          </View>
        ) : (
          <View style={styles.formContainer}>
            <TextInputField
              label="Email Address"
              placeholder="member@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              error={error || undefined}
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />

            <PrimaryButton
              title="Send Recovery Code"
              onPress={handleRequestReset}
              loading={loading}
              disabled={loading}
              style={{ marginTop: 12 }}
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
              Remembered your password? Sign In
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
  confirmationCard: {
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
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  confirmDescription: {
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
