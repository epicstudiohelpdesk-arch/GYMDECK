import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

const DEFAULT_STATUS_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Expired', value: 'EXPIRED' },
  { label: 'Frozen', value: 'FROZEN' },
  { label: 'Inactive', value: 'INACTIVE' },
];

interface FilterPillsProps {
  selectedStatus: string;
  onSelect: (status: string) => void;
  options?: FilterOption[];
}

export const FilterPills: React.FC<FilterPillsProps> = ({
  selectedStatus,
  onSelect,
  options = DEFAULT_STATUS_OPTIONS,
}) => {
  const { colors, typography, radii } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isSelected = selectedStatus === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pill,
              {
                borderRadius: radii.full,
                backgroundColor: isSelected ? colors.primarySoft : colors.surface,
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Filter ${option.label}${typeof option.count === 'number' ? `, ${option.count} members` : ''}`}
          >
            <Text
              style={[
                typography.captionBold,
                {
                  color: isSelected ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              {option.label}
            </Text>
            {typeof option.count === 'number' && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                    },
                  ]}
                >
                  {option.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 36,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
