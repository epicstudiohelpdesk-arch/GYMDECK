/**
 * GymDeck Owner Mobile - Standardized Search Bar
 *
 * Prominent, thumb-friendly search input inspired by high-efficiency mobile UX.
 * Features instant clear button and optional QR scan / filter accessory.
 */

import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Search, X, QrCode } from 'lucide-react-native';
import { useTheme } from '../../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onScanPress?: () => void;
  autoFocus?: boolean;
  style?: ViewStyle;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search members, phone, code...',
  onClear,
  onScanPress,
  autoFocus = false,
  style,
}) => {
  const { colors, typography, radii } = useTheme();

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radii.full,
        },
        style,
      ]}
    >
      <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />

      <TextInput
        style={[
          styles.input,
          typography.inputText,
          {
            color: colors.textPrimary,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
      />

      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={handleClear}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.clearCircle, { backgroundColor: colors.surfaceSubtle }]}>
            <X size={12} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      )}

      {onScanPress && (
        <TouchableOpacity
          style={[styles.scanBtn, { borderLeftColor: colors.border }]}
          onPress={onScanPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Scan QR pass"
        >
          <QrCode size={18} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontSize: 14,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  clearCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtn: {
    paddingLeft: 10,
    marginLeft: 8,
    borderLeftWidth: 1,
    height: 22,
    justifyContent: 'center',
  },
});
