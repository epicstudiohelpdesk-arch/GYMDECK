/**
 * GymDeck Owner Mobile - Auth Segmented Pill Tab Switcher
 * Recreates the pill capsule switcher [ Log In | Sign Up ] from reference image.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export type AuthTab = 'login' | 'signup';

interface AuthSegmentedTabsProps {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
}

export const AuthSegmentedTabs: React.FC<AuthSegmentedTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'login' && styles.activeTab]}
        onPress={() => onTabChange('login')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'login' }}
        accessibilityLabel="Log In Tab"
      >
        <Text style={[styles.tabText, activeTab === 'login' ? styles.activeTabText : styles.inactiveTabText]}>
          Log In
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
        onPress={() => onTabChange('signup')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'signup' }}
        accessibilityLabel="Sign Up Tab"
      >
        <Text style={[styles.tabText, activeTab === 'signup' ? styles.activeTabText : styles.inactiveTabText]}>
          Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 28,
    padding: 4,
    marginBottom: 20,
    height: 52,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    letterSpacing: -0.1,
  },
  activeTabText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  inactiveTabText: {
    fontWeight: '500',
    color: '#64748B',
  },
});
