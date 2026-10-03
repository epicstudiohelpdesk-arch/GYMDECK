/**
 * GymDeck Owner Mobile - Content-Shaped Loading Skeletons
 *
 * Content-shaped placeholders providing predictable visual layouts during async queries.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 16,
  borderRadius,
  style,
}) => {
  const { colors, radii } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: borderRadius ?? radii.xs,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const MetricCardSkeleton: React.FC = () => {
  const { colors, radii } = useTheme();

  return (
    <View style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
      <View style={styles.rowBetween}>
        <SkeletonBox width={36} height={36} borderRadius={radii.md} />
        <SkeletonBox width={50} height={18} borderRadius={radii.xs} />
      </View>
      <SkeletonBox width="60%" height={26} style={{ marginTop: 12 }} />
      <SkeletonBox width="40%" height={14} style={{ marginTop: 6 }} />
    </View>
  );
};

export const MemberCardSkeleton: React.FC = () => {
  const { colors, radii } = useTheme();

  return (
    <View style={[styles.skeletonRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg }]}>
      <SkeletonBox width={42} height={42} borderRadius={radii.md} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBox width="70%" height={16} />
        <SkeletonBox width="45%" height={12} style={{ marginTop: 6 }} />
      </View>
      <SkeletonBox width={55} height={20} borderRadius={radii.sm} />
    </View>
  );
};

export const AttendanceRowSkeleton: React.FC = () => {
  const { colors, radii } = useTheme();

  return (
    <View style={[styles.skeletonAttendanceRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md }]}>
      <SkeletonBox width={38} height={38} borderRadius={radii.md} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBox width="55%" height={15} />
        <SkeletonBox width="75%" height={11} style={{ marginTop: 5 }} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <SkeletonBox width={64} height={20} borderRadius={radii.xs} />
        <SkeletonBox width={50} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
};

export const TransactionRowSkeleton: React.FC = () => {
  const { colors, radii } = useTheme();

  return (
    <View style={[styles.skeletonTransactionRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md }]}>
      <SkeletonBox width={38} height={38} borderRadius={radii.md} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBox width="60%" height={15} />
        <SkeletonBox width="40%" height={11} style={{ marginTop: 5 }} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <SkeletonBox width={70} height={18} />
        <SkeletonBox width={50} height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
};

export const PendingDueRowSkeleton: React.FC = () => {
  const { colors, radii } = useTheme();

  return (
    <View style={[styles.skeletonDueRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md }]}>
      <SkeletonBox width={38} height={38} borderRadius={radii.md} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonBox width="50%" height={15} />
        <SkeletonBox width="35%" height={11} style={{ marginTop: 5 }} />
      </View>
      <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8 }}>
        <SkeletonBox width={60} height={16} />
        <SkeletonBox width={65} height={32} borderRadius={radii.sm} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonCard: {
    padding: 14,
    borderWidth: 1,
    flex: 1,
    margin: 4,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  skeletonAttendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  skeletonTransactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  skeletonDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
