/**
 * GymDeck Owner Mobile - Quick Actions & Action Rail
 *
 * Fast 1-tap thumb-friendly actions inspired by Flipkart/Blinkit ergonomics:
 * - Direct access to the top 4-5 operational gym workflows
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme';

export interface QuickActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: string;
  color?: string;
  bgColor?: string;
}

interface QuickActionProps {
  item: QuickActionItem;
  size?: 'md' | 'lg';
}

export const QuickAction: React.FC<QuickActionProps> = ({ item, size = 'md' }) => {
  const { colors, typography, radii, shadows } = useTheme();

  const boxSize = size === 'lg' ? 52 : 44;

  return (
    <TouchableOpacity
      style={styles.actionContainer}
      onPress={item.onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View
        style={[
          styles.iconBox,
          {
            width: boxSize,
            height: boxSize,
            borderRadius: radii.md,
            backgroundColor: item.bgColor || colors.primarySoft,
            borderColor: colors.border,
          },
          shadows.low,
        ]}
      >
        {item.icon}
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.surface }]}>
            <Text style={[styles.badgeText, { color: colors.textOnPrimary }]}>{item.badge}</Text>
          </View>
        )}
      </View>
      <Text style={[typography.captionBold, { color: colors.textPrimary, marginTop: 6, textAlign: 'center' }]} numberOfLines={1}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );
};

interface QuickActionRailProps {
  actions: QuickActionItem[];
  style?: ViewStyle;
}

export const QuickActionRail: React.FC<QuickActionRailProps> = ({ actions, style }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.railContent, style]}
    >
      {actions.map((action) => (
        <QuickAction key={action.id} item={action} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  actionContainer: {
    alignItems: 'center',
    width: 68,
    marginRight: 10,
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 4,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 10,
  },
  railContent: {
    paddingVertical: 8,
  },
});
