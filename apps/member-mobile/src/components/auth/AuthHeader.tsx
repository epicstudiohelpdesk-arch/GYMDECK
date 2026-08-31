/**
 * GymDeck Member Mobile - Auth Header Component
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../../theme';

export interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBackPress,
}) => {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { marginBottom: spacing.xl }]}>
      {showBack && (
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: colors.surfaceSubtle }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      )}

      <View style={styles.brandRow}>
        <Text style={[styles.brandMark, { color: colors.brand.primary }]}>GYMDECK</Text>
        <View style={[styles.badge, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={[styles.badgeText, { color: colors.brand.secondary }]}>MEMBER</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  brandMark: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});

export default AuthHeader;
