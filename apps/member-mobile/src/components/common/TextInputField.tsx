/**
 * GymDeck Member Mobile - Accessible Text Input Field Component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme';

export interface TextInputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: React.ReactNode;
  hint?: string;
}

export const TextInputField: React.FC<TextInputFieldProps> = ({
  label,
  error,
  isPassword = false,
  leftIcon,
  hint,
  style,
  ...props
}) => {
  const { colors, radii, spacing } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isSecure = isPassword && !showPassword;

  return (
    <View style={[styles.wrapper, { marginBottom: spacing.md }]}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        {hint && <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>}
      </View>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: error
              ? colors.status.error
              : isFocused
              ? colors.brand.primary
              : colors.border,
            borderRadius: radii.md,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              paddingLeft: leftIcon ? 0 : 16,
            },
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={label}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={18} color={colors.textMuted} />
            ) : (
              <Eye size={18} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 50,
  },
  leftIconContainer: {
    paddingLeft: 14,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    paddingRight: 16,
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '500',
  },
});

export default TextInputField;
