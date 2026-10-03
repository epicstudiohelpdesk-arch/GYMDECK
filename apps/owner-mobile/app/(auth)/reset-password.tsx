/**
 * GymDeck Owner Mobile - Modern Vibrant Reset Password Screen
 *
 * Designed to match the modern curved header & pill slider aesthetic:
 * - Curved vibrant header with brand emblem and abstract geometry
 * - Single-use token validation & password strength meter
 * - Clean rounded inputs with light subtle shake and fading highlight
 * - Signature "Swipe to Reset Password" slider button
 * - Clean confirmation view guiding to Sign In
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { KeyRound, Mail, Lock, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { OwnerAuthApiService } from '../../src/services/api/ownerAuthService';
import {
  AuthHeader,
  AuthField,
  AuthFieldRef,
  SwipeActionButton,
} from '../../src/components/auth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();

  const [email, setEmail] = useState(params.email || '');
  const [token, setToken] = useState(params.token || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Field Refs for light micro-shake and fading highlight
  const emailFieldRef = useRef<AuthFieldRef>(null);
  const tokenFieldRef = useRef<AuthFieldRef>(null);
  const newPasswordFieldRef = useRef<AuthFieldRef>(null);
  const confirmPasswordFieldRef = useRef<AuthFieldRef>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password Policy
  const passwordCriteria = useMemo(() => {
    return {
      hasLength: newPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      passwordsMatch: newPassword.length > 0 && newPassword === confirmPassword,
    };
  }, [newPassword, confirmPassword]);

  const isPasswordValid =
    passwordCriteria.hasLength &&
    passwordCriteria.hasUppercase &&
    passwordCriteria.hasNumber;

  const handleReset = async () => {
    if (isSubmitting) return;

    let hasMissing = false;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      emailFieldRef.current?.shake();
      hasMissing = true;
    }

    const trimmedToken = token.trim();
    if (!trimmedToken) {
      tokenFieldRef.current?.shake();
      hasMissing = true;
    }

    if (!newPassword) {
      newPasswordFieldRef.current?.shake();
      hasMissing = true;
    }

    if (!confirmPassword) {
      confirmPasswordFieldRef.current?.shake();
      hasMissing = true;
    }

    if (hasMissing) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      emailFieldRef.current?.shake();
      setError('Please enter a valid email address.');
      return;
    }

    if (trimmedToken.length < 6) {
      tokenFieldRef.current?.shake();
      setError('Enter the authorization token from your email.');
      return;
    }

    if (!isPasswordValid) {
      newPasswordFieldRef.current?.shake();
      setError('Password must meet complexity requirements.');
      return;
    }

    if (!passwordCriteria.passwordsMatch) {
      confirmPasswordFieldRef.current?.shake();
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await OwnerAuthApiService.resetPassword({
        email: trimmedEmail.toLowerCase(),
        token: trimmedToken,
        newPassword,
      });

      setNewPassword('');
      setConfirmPassword('');
      setIsSuccess(true);
    } catch (err: any) {
      setNewPassword('');
      setConfirmPassword('');
      setError(err?.message || 'Failed to reset password. The token may be expired or already used.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#EA4303" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Modern Curved Header */}
        <AuthHeader
          title="Reset Password"
          subtitle="Enter your authorization token and configure your new secure password."
        />

        {/* Form Sheet Card */}
        <View style={styles.formSheet}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={20} color="#EA4303" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {isSuccess ? (
            /* Success State */
            <View style={styles.confirmationCard}>
              <View style={styles.successIconBadge}>
                <CheckCircle2 size={40} color="#10B981" />
              </View>

              <Text style={styles.confirmationTitle}>Password Updated</Text>
              <Text style={styles.confirmationBody}>
                Your password has been successfully reset and all previous active sessions have been revoked. You can
                now sign in with your new credentials.
              </Text>

              <SwipeActionButton
                label="Proceed to Sign In"
                onAction={() => router.replace('/(auth)/login')}
              />
            </View>
          ) : (
            /* Reset Form */
            <View>
              {error && (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <AlertCircle size={18} color="#EF4444" style={styles.bannerIcon} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              {/* Email */}
              <AuthField
                ref={emailFieldRef}
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                icon={<Mail size={20} color="#94A3B8" />}
              />

              {/* Reset Token */}
              <AuthField
                ref={tokenFieldRef}
                label="Reset Authorization Token"
                placeholder="Enter token received in email"
                value={token}
                onChangeText={(text) => {
                  setToken(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                icon={<KeyRound size={20} color="#94A3B8" />}
              />

              {/* New Password */}
              <AuthField
                ref={newPasswordFieldRef}
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (error) setError(null);
                }}
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                icon={<Lock size={20} color="#94A3B8" />}
              />

              {/* Password Checklist */}
              <View style={styles.criteriaList}>
                <View style={styles.criteriaRow}>
                  <CheckCircle2
                    size={14}
                    color={passwordCriteria.hasLength ? '#10B981' : '#CBD5E1'}
                  />
                  <Text
                    style={[
                      styles.criteriaText,
                      passwordCriteria.hasLength && styles.criteriaTextActive,
                    ]}
                  >
                    Minimum 8 characters
                  </Text>
                </View>
                <View style={styles.criteriaRow}>
                  <CheckCircle2
                    size={14}
                    color={passwordCriteria.hasUppercase ? '#10B981' : '#CBD5E1'}
                  />
                  <Text
                    style={[
                      styles.criteriaText,
                      passwordCriteria.hasUppercase && styles.criteriaTextActive,
                    ]}
                  >
                    At least one uppercase letter (A-Z)
                  </Text>
                </View>
                <View style={styles.criteriaRow}>
                  <CheckCircle2
                    size={14}
                    color={passwordCriteria.hasNumber ? '#10B981' : '#CBD5E1'}
                  />
                  <Text
                    style={[
                      styles.criteriaText,
                      passwordCriteria.hasNumber && styles.criteriaTextActive,
                    ]}
                  >
                    At least one number (0-9)
                  </Text>
                </View>
              </View>

              {/* Confirm Password */}
              <AuthField
                ref={confirmPasswordFieldRef}
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (error) setError(null);
                }}
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                icon={<Lock size={20} color="#94A3B8" />}
              />

              {/* Swipe Action CTA */}
              <View style={{ marginTop: 8 }}>
                <SwipeActionButton
                  label="Swipe to Reset Password"
                  onAction={handleReset}
                  isSubmitting={isSubmitting}
                  disabled={isSubmitting}
                />
              </View>
            </View>
          )}

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Remember your credentials? </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Log In"
            >
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#EA4303',
  },
  formSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA4303',
    marginLeft: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  bannerIcon: {
    marginRight: 10,
  },
  criteriaList: {
    marginTop: -8,
    marginBottom: 16,
    paddingLeft: 4,
    gap: 6,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criteriaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 6,
    fontWeight: '500',
  },
  criteriaTextActive: {
    color: '#10B981',
  },
  confirmationCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  successIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmationBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
  },
  loginLink: {
    fontSize: 14,
    color: '#EA4303',
    fontWeight: '700',
  },
});
