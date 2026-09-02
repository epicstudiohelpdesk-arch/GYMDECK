import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GymMemberSummary } from '../types';
import { StatusBadge } from './StatusBadge';
import { Phone, Calendar, ChevronRight } from 'lucide-react-native';

interface MemberCardProps {
  member: GymMemberSummary;
  onPress: () => void;
}

export const MemberCard: React.FC<MemberCardProps> = ({ member, onPress }) => {
  const initial = member.fullName.charAt(0).toUpperCase() || 'M';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {member.fullName}
          </Text>
          <Text style={styles.code}>{member.memberCode}</Text>
        </View>
        <StatusBadge status={member.membershipStatus} />
      </View>

      <View style={styles.footer}>
        <View style={styles.detailRow}>
          <Phone size={13} color="#94A3B8" style={{ marginRight: 5 }} />
          <Text style={styles.detailText}>{member.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Calendar size={13} color="#94A3B8" style={{ marginRight: 5 }} />
          <Text style={styles.detailText}>
            {new Date(member.joinedAt).toLocaleDateString()}
          </Text>
        </View>
        <ChevronRight size={16} color="#64748B" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131823',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EAB308',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  code: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
