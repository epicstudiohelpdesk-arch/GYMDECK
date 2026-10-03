/**
 * GymDeck Owner Mobile - Section Header
 *
 * Clean section title with count badge and action trigger.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface SectionHeaderProps {
  title: string;
  count?: number;
  actionLabel?: string;
  onActionPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  actionLabel,
  onActionPress,
  showChevron = false,
  style,
}) => {
  const { colors, typography, radii } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <Text style={[typography.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        {typeof count === 'number' && (
          <View style={[styles.countBadge, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
              {count}
            </Text>
          </View>
        )}
      </View>

      {actionLabel && onActionPress && (
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onActionPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[typography.buttonSmall, { color: colors.primary }]}>
            {actionLabel}
          </Text>
          {showChevron && <ChevronRight size={14} color={colors.primary} style={{ marginLeft: 2 }} />}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
  },
});
