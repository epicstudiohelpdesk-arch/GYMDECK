/**
 * GymDeck Owner Mobile - Modern Vibrant Forgot Password Screen
 *
 * Designed to match the modern curved header & pill slider aesthetic:
 * - Curved vibrant header with brand emblem and abstract geometry
 * - Clean rounded email field with light subtle shake and fading highlight
 * - Signature "Swipe to Send Instructions" slider button
 * - Zero account enumeration confirmation card
 * - Seamless deep link to Reset Password
 */

import React, { useState, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { Mail, CheckCircle2, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { OwnerAuthApiService } from '../../src/services/api/ownerAuthService';
import {
  AuthHeader,
  AuthField,
  AuthFieldRef,
  SwipeActionButton,
} from '../../src/components/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailFieldRef = useRef<AuthFieldRef>(null);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      emailFieldRef.current?.shake();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      emailFieldRef.current?.shake();
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await OwnerAuthApiService.forgotPassword({ email: trimmedEmail });
      setIsSent(true);
    } catch {
      // Zero account enumeration: even on error, show confirmation
      setIsSent(true);
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
          title="Forgot Password"
          subtitle="Enter your registered owner or staff email to receive recovery instructions."
        />

        {/* Form Sheet Card */}
        <View style={styles.formSheet}>
          {/* Back to Sign In Link */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Sign In"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft size={20} color="#EA4303" />
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </TouchableOpacity>

          {isSent ? (
            /* Confirmation State (Zero Account Enumeration) */
            <View style={styles.confirmationCard}>
              <View style={styles.successIconBadge}>
                <CheckCircle2 size={40} color="#10B981" />
              </View>

              <Text style={styles.confirmationTitle}>Instructions Dispatched</Text>
              <Text style={styles.confirmationBody}>
                If an account exists for{' '}
                <Text style={styles.emailHighlight}>{email.trim()}</Text>, we have sent instructions to reset your
                password. Please check your inbox.
              </Text>

              <SwipeActionButton
                label="I Have a Reset Token"
                onAction={() =>
                  router.push({
                    pathname: '/(auth)/reset-password' as any,
                    params: { email: email.trim() },
                  })
                }
              />

              <TouchableOpacity
                style={styles.returnButton}
                onPress={() => router.replace('/(auth)/login')}
                accessibilityRole="button"
                accessibilityLabel="Return to Sign In"
              >
                <Text style={styles.returnButtonText}>Return to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Request Form */
            <View>
              {error && (
                <View style={styles.errorBanner} accessibilityRole="alert">
                  <AlertCircle size={18} color="#EF4444" style={styles.bannerIcon} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

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
                autoComplete="email"
                editable={!isSubmitting}
                icon={<Mail size={20} color="#94A3B8" />}
              />

              <SwipeActionButton
                label="Swipe to Send Instructions"
                onAction={handleSubmit}
                isSubmitting={isSubmitting}
                disabled={isSubmitting}
              />

              <TouchableOpacity
                style={styles.haveTokenLink}
                onPress={() =>
                  router.push({
                    pathname: '/(auth)/reset-password' as any,
                    params: { email: email.trim() },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Already have a reset token"
              >
                <Text style={styles.haveTokenText}>
                  Already have a reset token? Enter token
                </Text>
              </TouchableOpacity>
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
  emailHighlight: {
    fontWeight: '600',
    color: '#0F172A',
  },
  returnButton: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 12,
  },
  returnButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  haveTokenLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  haveTokenText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA4303',
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
