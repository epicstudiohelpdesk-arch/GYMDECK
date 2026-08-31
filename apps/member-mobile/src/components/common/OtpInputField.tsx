/**
 * GymDeck Member Mobile - 6-Digit OTP Input Field Component
 */

import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '../../theme';

export interface OtpInputFieldProps {
  value: string;
  onChange: (otp: string) => void;
  hasError?: boolean;
  length?: number;
  disabled?: boolean;
}

export const OtpInputField: React.FC<OtpInputFieldProps> = ({
  value,
  onChange,
  hasError = false,
  length = 6,
  disabled = false,
}) => {
  const { colors, radii } = useTheme();
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const handleChangeText = (text: string, index: number) => {
    if (disabled) return;

    // Handle full paste
    if (text.length > 1) {
      const cleanDigits = text.replace(/[^0-9]/g, '').slice(0, length);
      onChange(cleanDigits);
      const nextFocus = Math.min(cleanDigits.length, length - 1);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const cleanDigit = text.replace(/[^0-9]/g, '');
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    const newOtp = newDigits.join('');
    onChange(newOtp);

    // Auto-advance to next input if digit entered
    if (cleanDigit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => {
        const isFocused = focusedIndex === index;
        const digit = digits[index] || '';

        return (
          <View
            key={index}
            style={[
              styles.box,
              {
                backgroundColor: colors.surface,
                borderColor: hasError
                  ? colors.status.error
                  : isFocused
                  ? colors.brand.primary
                  : digit
                  ? colors.brand.secondary
                  : colors.border,
                borderRadius: radii.md,
              },
            ]}
          >
            <TextInput
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.digitInput,
                {
                  color: colors.textPrimary,
                },
              ]}
              value={digit}
              onChangeText={(text) => handleChangeText(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              keyboardType="number-pad"
              maxLength={index === 0 ? length : 1}
              selectTextOnFocus
              editable={!disabled}
              accessibilityLabel={`Digit ${index + 1} of ${length}`}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 12,
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitInput: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
});

export default OtpInputField;
