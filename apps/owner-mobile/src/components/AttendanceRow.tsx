/**
 * GymDeck Owner Mobile - Standardized Attendance Row Component
 *
 * Operational, high-density row component displaying:
 * - Member avatar with status indicator dot
 * - Member full name, member code, phone number
 * - Check-in time, check-out time, entry method badge
 * - "ON FLOOR" vs "CHECKED OUT" semantic badges
 * - Immediate 1-tap "Check Out" action for on-floor members (>= 44pt target)
 * - Navigation to /members/[id] on row tap
 * - Full accessibility compliance
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, LogOut, FileText } from 'lucide-react-native';
import { AttendanceItem } from '../types';
import { useTheme } from '../theme';
import { Avatar } from './ui/Avatar';
import { StatusBadge } from './StatusBadge';

interface AttendanceRowProps {
  item: AttendanceItem;
  onPress: () => void;
  onCheckOutPress: () => void;
  isCheckingOut?: boolean;
}

export const AttendanceRow: React.FC<AttendanceRowProps> = React.memo(({
  item,
  onPress,
  onCheckOutPress,
  isCheckingOut = false,
}) => {
  const { colors, typography, radii, shadows } = useTheme();

  const isOnFloor = !item.checkOutTime;

  const checkInFormatted = React.useMemo(() => {
    try {
      return new Date(item.checkInTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return item.checkInTime;
    }
  }, [item.checkInTime]);

  const checkOutFormatted = React.useMemo(() => {
    if (!item.checkOutTime) return null;
    try {
      return new Date(item.checkOutTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return item.checkOutTime;
    }
  }, [item.checkOutTime]);

  const accessibilityLabel = `${item.fullName}, Code ${item.memberCode}, ${
    isOnFloor ? `checked in at ${checkInFormatted}, currently on floor` : `checked in at ${checkInFormatted}, checked out at ${checkOutFormatted}`
  }. Tap to view member profile.`;

  return (
    <TouchableOpacity
      style={[
        styles.rowItem,
        {
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.contentRow}>
        {/* Member Avatar */}
        <Avatar
          name={item.fullName}
          size="sm"
          showStatusDot={isOnFloor}
          statusDotColor={colors.success}
        />

        {/* Member Identity & Details */}
        <View style={styles.detailsCol}>
          <View style={styles.titleRow}>
            <Text
              style={[typography.bodyBold, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {item.fullName}
            </Text>
            {item.entryMethod && item.entryMethod !== 'CODE_LOOKUP' && (
              <View
                style={[
                  styles.entryMethodBadge,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.xs,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10 }]}>
                  {item.entryMethod}
                </Text>
              </View>
            )}
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {item.memberCode} {item.phone ? `• ${item.phone}` : ''}
          </Text>

          {/* Time & Session Status */}
          <View style={styles.timeInfoRow}>
            <View style={styles.timeBadge}>
              <Clock size={12} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={[typography.captionBold, { color: colors.textPrimary, fontSize: 11 }]}>
                In: {checkInFormatted}
              </Text>
            </View>

            {checkOutFormatted ? (
              <View style={[styles.timeBadge, { marginLeft: 10 }]}>
                <LogOut size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                  Out: {checkOutFormatted}
                </Text>
              </View>
            ) : (
              <View style={[styles.timeBadge, { marginLeft: 10 }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[typography.captionBold, { color: colors.success, fontSize: 11 }]}>
                  Active
                </Text>
              </View>
            )}
          </View>

          {item.notes && (
            <View style={styles.notesRow}>
              <FileText size={11} color={colors.textMuted} style={{ marginRight: 4, marginTop: 2 }} />
              <Text
                style={[typography.caption, { color: colors.textMuted, fontStyle: 'italic', flex: 1 }]}
                numberOfLines={1}
              >
                {item.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Right Status / Actions */}
        <View style={styles.actionCol}>
          <StatusBadge status={isOnFloor ? 'ON FLOOR' : 'CHECKED OUT'} />

          {isOnFloor && (
            <TouchableOpacity
              style={[
                styles.checkOutBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.sm,
                },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onCheckOutPress();
              }}
              disabled={isCheckingOut}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Check out ${item.fullName}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <LogOut size={13} color={colors.danger} style={{ marginRight: 4 }} />
              <Text style={[typography.captionBold, { color: colors.danger, fontSize: 11 }]}>
                Check Out
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

AttendanceRow.displayName = 'AttendanceRow';

const styles = StyleSheet.create({
  rowItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryMethodBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
  },
  timeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  checkOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    minHeight: 32,
  },
});
