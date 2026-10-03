/**
 * GymDeck Owner Mobile - Standardized Member Directory Card
 *
 * Professional mobile card answering:
 * 1. WHO? (Member Name + Avatar Initial)
 * 2. WHAT CODE? (Member Code)
 * 3. WHAT STATUS? (StatusBadge)
 * 4. WHAT IMPORTANT THING? (Days remaining / Expiry date / Phone)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GymMemberSummary } from '../types';
import { StatusBadge } from './StatusBadge';
import { Avatar } from './ui/Avatar';
import { useTheme } from '../theme';

interface MemberCardProps {
  member: GymMemberSummary;
  onPress: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onPress }) => {
  const { colors, typography, radii, shadows } = useTheme();

  // Compute membership validity context if expiresAt is available
  const membershipContext = React.useMemo(() => {
    if (!member.expiresAt) {
      return {
        label: `Joined ${new Date(member.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
        isExpiringSoon: false,
      };
    }

    const diffDays = Math.ceil(
      (new Date(member.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const formattedDate = new Date(member.expiresAt).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });

    if (diffDays > 0 && diffDays <= 7) {
      return {
        label: `${diffDays}d left • Exp ${formattedDate}`,
        isExpiringSoon: true,
      };
    } else if (diffDays > 7) {
      return {
        label: `${diffDays}d left • Valid till ${formattedDate}`,
        isExpiringSoon: false,
      };
    } else {
      return {
        label: `Expired ${formattedDate}`,
        isExpiringSoon: false,
      };
    }
  }, [member.expiresAt, member.joinedAt]);

  const accessibilityText = `${member.fullName}, Code ${member.memberCode}, Status ${member.membershipStatus}, ${membershipContext.label}`;

  return (
    <TouchableOpacity
      style={[
        styles.directoryRow,
        {
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityText}
    >
      <Avatar
        name={member.fullName}
        size="md"
        showStatusDot={member.membershipStatus === 'ACTIVE'}
        statusDotColor={colors.success}
      />

      <View style={styles.centerCol}>
        <View style={styles.nameRow}>
          <Text style={[typography.cardTitle, { color: colors.textPrimary, fontSize: 15 }]} numberOfLines={1}>
            {member.fullName}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
            {member.memberCode}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>·</Text>
          <Text
            style={[
              typography.caption,
              {
                color: membershipContext.isExpiringSoon ? colors.warningText : colors.textSecondary,
                fontWeight: membershipContext.isExpiringSoon ? '600' : '400',
              },
            ]}
          >
            {membershipContext.label}
          </Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <StatusBadge status={member.membershipStatus} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  directoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  centerCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
