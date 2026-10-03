/**
 * GymDeck Owner Mobile - Connectivity & Sync Status Indicators
 *
 * Rules:
 * - Never falsely claims "Cloud Synchronized" when offline
 * - Masks internal technical jargon (outbox, inbox, cursor) from owners
 * - Clearly distinguishes Online vs Offline vs Syncing vs Sync Attention
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Check, RefreshCw, AlertCircle, WifiOff, Cloud } from 'lucide-react-native';
import { useTheme, ConnectivityStatus } from '../../theme';

interface SyncIndicatorProps {
  status: ConnectivityStatus;
  lastSyncedText?: string;
  style?: ViewStyle;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  status,
  lastSyncedText,
  style,
}) => {
  const { colors, typography, radii } = useTheme();

  const getIndicatorContent = () => {
    switch (status) {
      case 'ONLINE':
      case 'SYNCED':
        return {
          icon: <Check size={12} color={colors.success} />,
          text: lastSyncedText ? `Synced ${lastSyncedText}` : 'Synced with Cloud',
          color: colors.successText,
          bg: colors.successBg,
          border: colors.successBorder,
        };
      case 'SYNCING':
        return {
          icon: <RefreshCw size={12} color={colors.info} />,
          text: 'Syncing with Cloud...',
          color: colors.infoText,
          bg: colors.infoBg,
          border: colors.infoBorder,
        };
      case 'OFFLINE':
        return {
          icon: <WifiOff size={12} color={colors.warning} />,
          text: 'Working Offline • Saved on Device',
          color: colors.warningText,
          bg: colors.warningBg,
          border: colors.warningBorder,
        };
      case 'SYNC_ERROR':
        return {
          icon: <AlertCircle size={12} color={colors.danger} />,
          text: 'Sync Needs Attention',
          color: colors.dangerText,
          bg: colors.dangerBg,
          border: colors.dangerBorder,
        };
    }
  };

  const item = getIndicatorContent();

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: item.bg,
          borderColor: item.border,
          borderRadius: radii.full,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Connection status: ${item.text}`}
    >
      <View style={styles.iconBox}>{item.icon}</View>
      <Text style={[typography.captionBold, { color: item.color, marginLeft: 5 }]}>
        {item.text}
      </Text>
    </View>
  );
};

interface OfflineBannerProps {
  isOffline: boolean;
  pendingCount?: number;
  style?: ViewStyle;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  pendingCount = 0,
  style,
}) => {
  const { colors, typography, radii } = useTheme();

  if (!isOffline) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.warningBg,
          borderColor: colors.warningBorder,
          borderRadius: radii.md,
        },
        style,
      ]}
      accessibilityRole="alert"
    >
      <WifiOff size={16} color={colors.warning} style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Text style={[typography.captionBold, { color: colors.warningText }]}>
          Offline Mode
        </Text>
        <Text style={[typography.caption, { color: colors.warningText }]}>
          {pendingCount > 0
            ? `${pendingCount} action${pendingCount > 1 ? 's' : ''} saved locally. Will sync automatically when reconnected.`
            : 'All actions continue to be saved securely on this device.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
});
