/**
 * GymDeck Member Mobile - Signup Screen
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
import { User, Mail, Phone, Lock, CheckSquare, Square } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store';
import { authService } from '../../src/services/api';
import { AuthHeader, TextInputField, PrimaryButton, ErrorBanner } from '../../src/components';
import { SignupSchema } from '../../src/validation';
import { AppError } from '../../src/errors';
import { useNetworkStatus } from '../../src/hooks';

export default function SignupScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const setPendingVerificationEmail = useAuthStore(
    (state) => state.setPendingVerificationEmail
  );
  const { isConnected } = useNetworkStatus();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | AppError | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setGeneralError(null);
    setErrors({});

    if (!isConnected) {
      setGeneralError(AppError.network('Internet connection is required to register.'));
      return;
    }

    const validationResult = SignupSchema.safeParse({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      agreeToTerms,
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
      await authService.signup(validationResult.data);
      setPendingVerificationEmail(validationResult.data.email);
      router.push('/(auth)/verify-email');
    } catch (err) {
      const appErr = AppError.fromUnknown(err);
      if (appErr.validationErrors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(appErr.validationErrors).forEach(([k, v]) => {
          fieldErrors[k] = v[0];
        });
        setErrors(fieldErrors);
      }
      setGeneralError(appErr);
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
          title="Create Account"
          subtitle="Join your gym on GymDeck to track workouts, check in faster, and manage your membership."
          showBack={true}
        />

        <ErrorBanner error={generalError} onDismiss={() => setGeneralError(null)} />

        <View style={styles.formContainer}>
          <TextInputField
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            error={errors.fullName}
            leftIcon={<User size={18} color={colors.textMuted} />}
          />

          <TextInputField
            label="Email Address"
            placeholder="member@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            keyboardType="email-address"
            error={errors.email}
            leftIcon={<Mail size={18} color={colors.textMuted} />}
            hint="Verification code will be sent here"
          />

          <TextInputField
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
            }}
            keyboardType="phone-pad"
            error={errors.phone}
            leftIcon={<Phone size={18} color={colors.textMuted} />}
            hint="Optional - Unverified account field"
          />

          <TextInputField
            label="Password"
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
            label="Confirm Password"
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

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => {
              setAgreeToTerms(!agreeToTerms);
              if (errors.agreeToTerms) setErrors((prev) => ({ ...prev, agreeToTerms: '' }));
            }}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreeToTerms }}
          >
            {agreeToTerms ? (
              <CheckSquare size={20} color={colors.brand.primary} />
            ) : (
              <Square size={20} color={colors.border} />
            )}
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              I agree to the{' '}
              <Text style={{ color: colors.brand.primary, fontWeight: '600' }}>
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text style={{ color: colors.brand.primary, fontWeight: '600' }}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
          {errors.agreeToTerms ? (
            <Text style={[styles.termsError, { color: colors.status.error }]}>
              {errors.agreeToTerms}
            </Text>
          ) : null}

          <PrimaryButton
            title="Create Member Account"
            onPress={handleSignup}
            loading={loading}
            disabled={loading}
            style={{ marginTop: 12 }}
          />
        </View>

        <View style={[styles.footerRow, { marginTop: spacing.xl }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
            accessibilityLabel="Sign in to existing account"
          >
            <Text style={[styles.footerLink, { color: colors.brand.primary }]}>Sign In</Text>
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
  termsText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  termsError: {
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 30,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
