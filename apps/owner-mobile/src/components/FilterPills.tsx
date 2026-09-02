import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

const STATUS_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Frozen', value: 'FROZEN' },
  { label: 'Inactive', value: 'INACTIVE' },
];

interface FilterPillsProps {
  selectedStatus: string;
  onSelect: (status: string) => void;
}

export const FilterPills: React.FC<FilterPillsProps> = ({ selectedStatus, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {STATUS_OPTIONS.map((option) => {
        const isSelected = selectedStatus === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#131823',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 6,
  },
  pillSelected: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#EAB308',
  },
  pillText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: '#EAB308',
    fontWeight: '700',
  },
});
