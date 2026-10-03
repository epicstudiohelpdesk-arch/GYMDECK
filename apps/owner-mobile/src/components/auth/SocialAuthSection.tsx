/**
 * GymDeck Owner Mobile - Social Auth / SSO Buttons Section
 * Recreates the "Or continue with" divider and Google + Apple pill buttons.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SocialAuthSectionProps {
  onGooglePress?: () => void;
  onApplePress?: () => void;
}

export const SocialAuthSection: React.FC<SocialAuthSectionProps> = ({
  onGooglePress,
  onApplePress,
}) => {
  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Button Row */}
      <View style={styles.buttonRow}>
        {/* Google Button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={onGooglePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.icon}>
            <Path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <Path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <Path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <Path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </Svg>
          <Text style={styles.socialButtonText}>Google</Text>
        </TouchableOpacity>

        {/* Apple Button */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={onApplePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Continue with Apple"
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.icon}>
            <Path
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.85-1 2.95 1.07.08 2.16-.54 2.81-1.35z"
              fill="#0F172A"
            />
          </Svg>
          <Text style={styles.socialButtonText}>Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#F8FAFC',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  icon: {
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
});
