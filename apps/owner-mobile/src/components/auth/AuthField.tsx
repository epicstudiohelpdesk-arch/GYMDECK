/**
 * GymDeck Owner Mobile - Modern Clean Rounded Form Field
 *
 * Designed with premium, understated aesthetics:
 * - Rounded input container with subtle border
 * - Focus state highlights with brand accent (#EA4303)
 * - Light, subtle 4px micro-shake animation
 * - Temporary alert highlight overlay that smoothly fades away after a few milliseconds
 * - Clean UI with zero clutter (no error text below fields)
 * - Password visibility toggle
 */

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

export interface AuthFieldRef {
  shake: () => void;
}

export interface AuthFieldProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
  isPassword?: boolean;
}

export const AuthField = forwardRef<AuthFieldRef, AuthFieldProps>(
  (
    {
      label,
      icon,
      isPassword = false,
      ...inputProps
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Native-driven light shake & temporary highlight animations
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const highlightOpacity = useRef(new Animated.Value(0)).current;
    const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const triggerShake = () => {
      // Clear any pending fade timer
      if (fadeTimer.current) {
        clearTimeout(fadeTimer.current);
      }

      // 1. Subtle, light micro-shake (max 4px amplitude, ~220ms total)
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -4, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 35, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
      ]).start();

      // 2. Immediately show alert highlight
      Animated.timing(highlightOpacity, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }).start();

      // 3. Smoothly fade highlight away after 650 milliseconds
      fadeTimer.current = setTimeout(() => {
        Animated.timing(highlightOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start();
      }, 650);
    };

    useImperativeHandle(ref, () => ({
      shake: triggerShake,
    }));

    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>

        <Animated.View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          {/* Temporary highlight overlay that smoothly fades away */}
          <Animated.View
            style={[
              styles.highlightOverlay,
              {
                opacity: highlightOpacity,
              },
            ]}
            pointerEvents="none"
          />

          {icon && <View style={styles.iconSlot}>{icon}</View>}

          <TextInput
            style={styles.input}
            placeholderTextColor="#94A3B8"
            secureTextEntry={isPassword && !showPassword}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...inputProps}
          />

          {isPassword && (
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={20} color="#64748B" />
              ) : (
                <Eye size={20} color="#64748B" />
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    );
  }
);

AuthField.displayName = 'AuthField';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    position: 'relative',
  },
  inputWrapperFocused: {
    borderColor: '#EA4303',
    borderWidth: 1.5,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    borderWidth: 1.6,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  iconSlot: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 6,
    marginLeft: 6,
  },
});
