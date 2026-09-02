/**
 * GymDeck Owner Mobile - Owner & Staff Authentication Screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react-native';

export default function OwnerLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    try {
      clearError();
      await login({ email: email.trim(), password });
    } catch {
      // Error is set in store
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Shield size={36} color="#EAB308" />
          </View>
          <Text style={styles.brandTitle}>GYMDECK</Text>
          <Text style={styles.portalSubtitle}>OWNER & STAFF PORTAL</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Sign in to your Gym</Text>
          <Text style={styles.formDescription}>
            Enter your management credentials to access live operations.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color="#EF4444" style={styles.errorIcon} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="owner@gym.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, (!email || !password || isLoading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!email || !password || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A0D14" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Security Note */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🔒 End-to-End Multi-Tenant Isolation & Cloud Synchronization
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#F8FAFC',
  },
  portalSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#EAB308',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#131823',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  formDescription: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F141F',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#EAB308',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#0A0D14',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
