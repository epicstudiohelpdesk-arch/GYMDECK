/**
 * GymDeck Member Mobile - Onboarding Gym Linking Screen
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Building2, QrCode, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store';
import { authService } from '../../src/services/api';
import { useNetworkStatus } from '../../src/hooks';
import {
  AuthHeader,
  TextInputField,
  PrimaryButton,
  ErrorBanner,
} from '../../src/components';
import { AppError } from '../../src/errors';

export default function GymLinkingScreen() {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { user, setUser, setOnboarded } = useAuthStore();
  const { isConnected } = useNetworkStatus();

  const [gymCode, setGymCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | AppError | null>(null);

  const handleLinkGym = async () => {
    setGeneralError(null);

    const cleanCode = gymCode.trim().toUpperCase();
    if (!cleanCode) {
      setGeneralError('Please enter your 6 to 8-character gym affiliation code.');
      return;
    }

    if (!isConnected) {
      setGeneralError(AppError.network('Internet connection is required to link your gym.'));
      return;
    }

    setLoading(true);

    try {
      const { gym, user: updatedUser } = await authService.linkGym(cleanCode);
      if (user) {
        setUser({ ...user, ...updatedUser, gymId: gym.id });
      } else {
        setUser({ ...updatedUser, gymId: gym.id });
      }
      setOnboarded(true);
      router.replace('/(main)/(tabs)');
    } catch (err) {
      setGeneralError(AppError.fromUnknown(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setOnboarded(true);
    router.replace('/(main)/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthHeader
            title="Link Your Gym"
            subtitle="Connect your member profile to your gym's GymDeck system to activate your membership and pass."
            showBack={true}
          />

        <ErrorBanner error={generalError} onDismiss={() => setGeneralError(null)} />

        <View style={styles.formContainer}>
          <TextInputField
            label="Gym Affiliation Code"
            placeholder="e.g. GD-NYC-101"
            value={gymCode}
            onChangeText={(text) => {
              setGymCode(text.toUpperCase());
              if (generalError) setGeneralError(null);
            }}
            autoCapitalize="characters"
            leftIcon={<Building2 size={18} color={colors.textMuted} />}
            hint="Provided by your gym reception or onboarding email"
          />

          <PrimaryButton
            title="Link Gym & Enter"
            onPress={handleLinkGym}
            loading={loading}
            disabled={loading || !gymCode.trim()}
            style={{ marginTop: 8 }}
          />

          <View style={[styles.dividerRow, { marginVertical: spacing.lg }]}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[
              styles.qrOptionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.md,
              },
            ]}
            onPress={() => {
              setGeneralError('QR Scanner camera integration requires Expo Development Build with camera permissions.');
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Scan gym QR code"
          >
            <View
              style={[
                styles.qrIconWrapper,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <QrCode size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.qrTextWrapper}>
              <Text style={[styles.qrTitle, { color: colors.textPrimary }]}>
                Scan Reception QR Code
              </Text>
              <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>
                Point your camera at the GymDeck counter QR code
              </Text>
            </View>
            <ArrowRight size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.footerRow, { marginTop: spacing.xxl }]}>
          <TouchableOpacity
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip gym linking for now"
          >
            <Text style={[styles.skipLink, { color: '#6B7280' }]}>
              I'll link my gym later <Text style={{ color: '#4F75E3', fontWeight: '800' }}>Skip</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  qrOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  qrIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#E0E9FD',
  },
  qrTextWrapper: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  qrSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#6B7280',
  },
  footerRow: {
    alignItems: 'center',
  },
  skipLink: {
    fontSize: 14,
  },
});
