/**
 * GymDeck Member Mobile - Login Screen
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
import { Mail, Lock } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store';
import { authService } from '../../src/services/api';
import { AuthHeader, TextInputField, PrimaryButton, ErrorBanner } from '../../src/components';
import { LoginSchema } from '../../src/validation';
import { AppError } from '../../src/errors';
import { useNetworkStatus } from '../../src/hooks';

export default function LoginScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const { isConnected } = useNetworkStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | AppError | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setGeneralError(null);
    setErrors({});

    if (!isConnected) {
      setGeneralError(AppError.network('Internet connection is required to sign in.'));
      return;
    }

    const validationResult = LoginSchema.safeParse({ email, password });
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
      const { user, tokens } = await authService.login({
        email: validationResult.data.email,
        password: validationResult.data.password,
      });

      await setSession(user, tokens);
      router.replace('/');
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
          title="Welcome Back"
          subtitle="Sign in to access your workout routines, membership pass, and check-in barcode."
          showBack={false}
        />

        <ErrorBanner error={generalError} onDismiss={() => setGeneralError(null)} />

        <View style={styles.formContainer}>
          <TextInputField
            label="Email Address"
            placeholder="member@gymdeck.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
            }}
            keyboardType="email-address"
            error={errors.email}
            leftIcon={<Mail size={18} color={colors.textMuted} />}
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
          />

          <View style={styles.forgotPasswordRow}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Text style={[styles.forgotPasswordText, { color: colors.brand.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          <PrimaryButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          />
        </View>

        <View style={[styles.footerRow, { marginTop: spacing.xxl }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Don't have a member account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup')}
            accessibilityRole="button"
            accessibilityLabel="Sign up for an account"
          >
            <Text style={[styles.footerLink, { color: colors.brand.primary }]}>Sign Up</Text>
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
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
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
