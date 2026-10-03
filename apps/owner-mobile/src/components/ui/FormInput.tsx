/**
 * GymDeck Owner Mobile - Standardized Form Input Primitive
 *
 * Implements mobile-first form behavior:
 * - Thumb-friendly target >= 48pt
 * - Clear focused, error, and disabled visual states
 * - Inline error and helper message display
 * - Prefix & suffix accessory support
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  onSuffixPress?: () => void;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  helperText,
  prefixIcon,
  suffixIcon,
  onSuffixPress,
  containerStyle,
  required = false,
  editable = true,
  ...inputProps
}) => {
  const { colors, typography, radii, layout } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return colors.danger;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  const getBackgroundColor = () => {
    if (!editable) return colors.surfaceSubtle;
    if (isFocused) return colors.surface;
    return colors.surface;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[typography.formLabel, { color: colors.textPrimary }]}>
            {label}
            {required && <Text style={{ color: colors.danger }}> *</Text>}
          </Text>
        </View>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            minHeight: layout.inputHeight,
            borderRadius: radii.md,
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
            borderWidth: isFocused || error ? 1.5 : 1,
          },
        ]}
      >
        {prefixIcon && <View style={styles.prefix}>{prefixIcon}</View>}

        <TextInput
          style={[
            styles.input,
            typography.inputText,
            {
              color: editable ? colors.textPrimary : colors.textDisabled,
            },
          ]}
          placeholderTextColor={colors.textMuted}
          editable={editable}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />

        {suffixIcon && (
          <TouchableOpacity
            style={styles.suffix}
            onPress={onSuffixPress}
            disabled={!onSuffixPress}
            activeOpacity={0.7}
          >
            {suffixIcon}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[typography.errorText, { color: colors.danger, marginTop: 4 }]}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={[typography.helperText, { color: colors.textMuted, marginTop: 4 }]}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  prefix: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 10,
  },
  suffix: {
    marginLeft: 8,
    padding: 4,
  },
});
