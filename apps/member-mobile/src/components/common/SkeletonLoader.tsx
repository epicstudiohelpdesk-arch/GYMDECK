/**
 * GymDeck Member Mobile - Lightweight Skeleton Loader Component
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
}) => {
  const { colors, radii } = useTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          backgroundColor: colors.surfaceSubtle,
          borderRadius: borderRadius !== undefined ? borderRadius : radii.md,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    opacity: 0.7,
    marginVertical: 4,
  },
});

export default SkeletonLoader;
