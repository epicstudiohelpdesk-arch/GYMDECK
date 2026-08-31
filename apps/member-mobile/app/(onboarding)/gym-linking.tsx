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
      }
      setOnboarded(true);
      router.replace('/');
    } catch (err) {
      setGeneralError(AppError.fromUnknown(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setOnboarded(true);
    router.replace('/');
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
            <Text style={[styles.skipLink, { color: colors.textMuted }]}>
              I'll link my gym later <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Skip</Text>
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
  },
  qrOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
  },
  qrIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrTextWrapper: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  qrSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerRow: {
    alignItems: 'center',
  },
  skipLink: {
    fontSize: 14,
  },
});
