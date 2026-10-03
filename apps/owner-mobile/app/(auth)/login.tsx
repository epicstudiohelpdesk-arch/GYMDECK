/**
 * GymDeck Owner Mobile - Unified Auth Screen (Sign In & Sign Up)
 *
 * Designed to match the modern curved header & pill slider aesthetic:
 * - Single still screen: switching tabs NEVER navigates or scrolls the entire page
 * - Active tab activates in place and form contents smoothly replace
 * - Curved vibrant header with brand emblem and abstract geometry
 * - Capsule segmented switcher [ Log In | Sign Up ]
 * - Clean rounded inputs with left icons and eye visibility toggle
 * - Light subtle micro-shake with temporary fading highlight on empty swipe
 * - Signature "Swipe to Login" / "Swipe to Sign up" slider button
 * - Zero account enumeration security & automatic session clearing
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
import {
  Mail,
  Lock,
  Check,
  AlertCircle,
  Building2,
  User,
  CheckCircle2,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import {
  AuthHeader,
  AuthSegmentedTabs,
  AuthField,
  AuthFieldRef,
  SwipeActionButton,
  SocialAuthSection,
  AuthTab,
} from '../../src/components/auth';
import { allowDevVerificationNav } from '../../src/utils/nativeRuntimeDiagnostic';

interface AuthScreenProps {
  initialTab?: AuthTab;
}

export default function OwnerAuthScreen({ initialTab }: AuthScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  // Determine initial active tab
  const startingTab: AuthTab =
    initialTab || (params.tab === 'signup' ? 'signup' : 'login');
  const [activeTab, setActiveTab] = useState<AuthTab>(startingTab);

  // Common UI State
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Signup Form State
  const [gymName, setGymName] = useState('');
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Field Refs for subtle micro-shake
  const loginEmailRef = useRef<AuthFieldRef>(null);
  const loginPasswordRef = useRef<AuthFieldRef>(null);

  const gymNameRef = useRef<AuthFieldRef>(null);
  const fullNameRef = useRef<AuthFieldRef>(null);
  const signupEmailRef = useRef<AuthFieldRef>(null);
  const signupPasswordRef = useRef<AuthFieldRef>(null);
  const confirmPasswordRef = useRef<AuthFieldRef>(null);

  const { login, signup, error: storeError, sessionExpiredMessage, clearError } =
    useAuthStore();

  // Signup Password Criteria
  const passwordCriteria = useMemo(() => {
    return {
      hasLength: signupPassword.length >= 8,
      hasUppercase: /[A-Z]/.test(signupPassword),
      hasNumber: /[0-9]/.test(signupPassword),
      passwordsMatch:
        signupPassword.length > 0 && signupPassword === confirmPassword,
    };
  }, [signupPassword, confirmPassword]);

  const isPasswordValid =
    passwordCriteria.hasLength &&
    passwordCriteria.hasUppercase &&
    passwordCriteria.hasNumber;

  // In-place tab switcher: stays still, replaces contents
  const handleTabChange = (tab: AuthTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setLocalError(null);
    clearError();
  };

  // Handle Login Submission
  const handleLogin = async () => {
    if (isSubmitting) return;

    let hasMissing = false;
    const trimmedEmail = loginEmail.trim();

    if (!trimmedEmail) {
      loginEmailRef.current?.shake();
      hasMissing = true;
    }

    if (!loginPassword) {
      loginPasswordRef.current?.shake();
      hasMissing = true;
    }

    if (hasMissing) return;

    try {
      setIsSubmitting(true);
      setLocalError(null);
      clearError();

      await login({ email: trimmedEmail, password: loginPassword });
      setLoginPassword('');
    } catch (err: any) {
      setLoginPassword('');
      setLocalError(err?.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Signup Submission
  const handleSignup = async () => {
    if (isSubmitting) return;

    let hasMissing = false;

    if (!gymName.trim()) {
      gymNameRef.current?.shake();
      hasMissing = true;
    }

    if (!fullName.trim()) {
      fullNameRef.current?.shake();
      hasMissing = true;
    }

    if (!signupEmail.trim()) {
      signupEmailRef.current?.shake();
      hasMissing = true;
    }

    if (!signupPassword) {
      signupPasswordRef.current?.shake();
      hasMissing = true;
    }

    if (!confirmPassword) {
      confirmPasswordRef.current?.shake();
      hasMissing = true;
    }

    if (hasMissing) return;

    if (gymName.trim().length < 2) {
      gymNameRef.current?.shake();
      setLocalError('Gym or facility name must be at least 2 characters.');
      return;
    }

    if (fullName.trim().length < 2) {
      fullNameRef.current?.shake();
      setLocalError('Full name must be at least 2 characters.');
      return;
    }

    const trimmedEmail = signupEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      signupEmailRef.current?.shake();
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!isPasswordValid) {
      signupPasswordRef.current?.shake();
      setLocalError('Password must meet all complexity requirements.');
      return;
    }

    if (!passwordCriteria.passwordsMatch) {
      confirmPasswordRef.current?.shake();
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      clearError();

      await signup({
        gymName: gymName.trim(),
        fullName: fullName.trim(),
        email: trimmedEmail.toLowerCase(),
        password: signupPassword,
      });

      // Clear signup form
      setGymName('');
      setFullName('');
      setSignupEmail('');
      setSignupPassword('');
      setConfirmPassword('');

      // Pre-fill the login email with the newly registered account
      setLoginEmail(trimmedEmail);

      // Switch smoothly in-place to the login tab
      setActiveTab('login');
    } catch (err: any) {
      setSignupPassword('');
      setConfirmPassword('');
      setLocalError(err?.message || 'Registration failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || storeError;

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
        {/* Modern Curved Header with floating geometry & brand emblem */}
        <AuthHeader
          title={activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
          subtitle={
            activeTab === 'login'
              ? 'Manage your members, staff, and gym performance seamlessly.'
              : 'Join GymDeck and start managing your facility, trainers, and members.'
          }
        />

        {/* Form Sheet Card with upward overlap */}
        <View style={styles.formSheet}>
          {/* Segmented Capsule Switcher [ Log In | Sign Up ] - In Place */}
          <AuthSegmentedTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />

          {/* Session Expiry Banner (Login Only) */}
          {activeTab === 'login' && sessionExpiredMessage && (
            <View style={styles.warningBanner} accessibilityRole="alert">
              <AlertCircle size={18} color="#D97706" style={styles.bannerIcon} />
              <Text style={styles.warningBannerText}>{sessionExpiredMessage}</Text>
            </View>
          )}

          {/* Server / Auth Error Banner */}
          {displayError && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <AlertCircle size={18} color="#EF4444" style={styles.bannerIcon} />
              <Text style={styles.errorBannerText}>{displayError}</Text>
            </View>
          )}

          {/* ==================== LOGIN FORM ==================== */}
          {activeTab === 'login' ? (
            <View>
              {/* Email Field */}
              <AuthField
                ref={loginEmailRef}
                label="Email"
                placeholder="Enter your email"
                value={loginEmail}
                onChangeText={(text) => {
                  setLoginEmail(text);
                  if (localError) setLocalError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isSubmitting}
                icon={<Mail size={20} color="#94A3B8" />}
              />

              {/* Password Field */}
              <AuthField
                ref={loginPasswordRef}
                label="Password"
                placeholder="Enter your Password"
                value={loginPassword}
                onChangeText={(text) => {
                  setLoginPassword(text);
                  if (localError) setLocalError(null);
                }}
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                editable={!isSubmitting}
                icon={<Lock size={20} color="#94A3B8" />}
              />

              {/* Utilities Row: Remember Me & Forgot Password */}
              <View style={styles.utilitiesRow}>
                <TouchableOpacity
                  style={styles.rememberMeRow}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  accessibilityLabel="Remember me"
                >
                  <View
                    style={[styles.checkbox, rememberMe && styles.checkboxActive]}
                  >
                    {rememberMe && (
                      <Check size={13} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password' as any)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot Password"
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Swipe Action CTA Button */}
              <SwipeActionButton
                label="Swipe to Login"
                onAction={handleLogin}
                isSubmitting={isSubmitting}
                disabled={isSubmitting}
              />
            </View>
          ) : (
            /* ==================== SIGNUP FORM ==================== */
            <View>
              {/* Gym / Facility Name */}
              <AuthField
                ref={gymNameRef}
                label="Gym / Facility Name"
                placeholder="Enter gym or facility name"
                value={gymName}
                onChangeText={(text) => {
                  setGymName(text);
                  if (localError) setLocalError(null);
                }}
                autoCapitalize="words"
                editable={!isSubmitting}
                icon={<Building2 size={20} color="#94A3B8" />}
              />

              {/* Full Name */}
              <AuthField
                ref={fullNameRef}
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (localError) setLocalError(null);
                }}
                autoCapitalize="words"
                autoComplete="name"
                editable={!isSubmitting}
                icon={<User size={20} color="#94A3B8" />}
              />

              {/* Email */}
              <AuthField
                ref={signupEmailRef}
                label="Email"
                placeholder="Enter your email"
                value={signupEmail}
                onChangeText={(text) => {
                  setSignupEmail(text);
                  if (localError) setLocalError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={!isSubmitting}
                icon={<Mail size={20} color="#94A3B8" />}
              />

              {/* Password */}
              <AuthField
                ref={signupPasswordRef}
                label="Password"
                placeholder="Enter your Password"
                value={signupPassword}
                onChangeText={(text) => {
                  setSignupPassword(text);
                  if (localError) setLocalError(null);
                }}
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                icon={<Lock size={20} color="#94A3B8" />}
              />

              {/* Password Strength Checklist */}
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
                ref={confirmPasswordRef}
                label="Confirm Password"
                placeholder="Confirm your Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (localError) setLocalError(null);
                }}
                isPassword
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
                icon={<Lock size={20} color="#94A3B8" />}
              />

              {/* Swipe Action CTA Button */}
              <View style={{ marginTop: 8 }}>
                <SwipeActionButton
                  label="Swipe to Sign up"
                  onAction={handleSignup}
                  isSubmitting={isSubmitting}
                  disabled={isSubmitting}
                />
              </View>
            </View>
          )}

          {/* Social Auth Divider & Buttons */}
          <SocialAuthSection />

          {/* Footer Navigation (Switches In-Place Without Page Navigation) */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {activeTab === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}
            </Text>
            <TouchableOpacity
              onPress={() =>
                handleTabChange(activeTab === 'login' ? 'signup' : 'login')
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={
                activeTab === 'login' ? 'Create an account' : 'Log In'
              }
            >
              <Text style={styles.switchLink}>
                {activeTab === 'login' ? 'Create an account' : 'Log In'}
              </Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && (
            <TouchableOpacity
              style={{ marginTop: 20, marginBottom: 12, paddingVertical: 8, alignItems: 'center' }}
              onPress={() => {
                allowDevVerificationNav();
                router.push('/dev-verification' as any);
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748B' }}>
                ⚡ Native Verification Dashboard (DEV)
              </Text>
            </TouchableOpacity>
          )}
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  bannerIcon: {
    marginRight: 10,
  },
  utilitiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 2,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#EA4303',
    borderColor: '#EA4303',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#EA4303',
    fontWeight: '600',
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
  switchLink: {
    fontSize: 14,
    color: '#EA4303',
    fontWeight: '700',
  },
});
