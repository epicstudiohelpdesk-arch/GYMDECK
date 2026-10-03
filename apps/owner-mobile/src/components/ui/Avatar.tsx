/**
 * GymDeck Owner Mobile - Standardized Avatar
 *
 * Renders member/staff initials or image with optional active status indicator.
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showStatusDot?: boolean;
  statusDotColor?: string;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 'md',
  showStatusDot = false,
  statusDotColor,
  style,
}) => {
  const { colors, typography, radii } = useTheme();

  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { boxSize: 32, fontSize: 12, dotSize: 8 };
      case 'lg':
        return { boxSize: 52, fontSize: 18, dotSize: 12 };
      case 'md':
      default:
        return { boxSize: 42, fontSize: 15, dotSize: 10 };
    }
  };

  const dim = getDimensions();
  const initial = (name || 'M').trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.wrapper, { width: dim.boxSize, height: dim.boxSize }, style]}>
      <View
        style={[
          styles.circle,
          {
            width: dim.boxSize,
            height: dim.boxSize,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: dim.fontSize }]}>
          {initial}
        </Text>
      </View>

      {showStatusDot && (
        <View
          style={[
            styles.dot,
            {
              width: dim.dotSize,
              height: dim.dotSize,
              borderRadius: dim.dotSize / 2,
              backgroundColor: statusDotColor || colors.success,
              borderColor: colors.surface,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
  },
});
