/**
 * GymDeck Member Mobile - Authenticated Bottom Tabs Navigator
 * Custom-built Bottom Navigation Bar exactly replicating the reference design:
 * - Pure crisp white elevated dock with smooth rounded top corners (borderTopRadius: 28)
 * - Signature Periwinkle Blue active color (#4F75E3 / #3B82F6)
 * - Centered active micro-dot indicator directly below the active label (•)
 * - Adaptive safe-area scaling for iOS home indicator and Android navigation bars
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Calendar, QrCode, MessageSquare, User } from 'lucide-react-native';

interface CustomBottomTabBarProps {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: any }>;
  };
  descriptors: Record<string, { options?: any }>;
  emitter?: {
    emit: (options: any) => any;
  };
  navigateToTab: (routeKey: string) => void;
  insets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface TabItemConfig {
  label: string;
  icon: (color: string, focused: boolean) => React.ReactNode;
}

const TAB_CONFIGS: Record<string, TabItemConfig> = {
  index: {
    label: 'Home',
    icon: (color, focused) => (
      <House
        size={22}
        color={color}
        fill={focused ? color : 'none'}
        strokeWidth={focused ? 1.5 : 1.9}
      />
    ),
  },
  workouts: {
    label: 'Workouts',
    icon: (color, focused) => (
      <Calendar
        size={22}
        color={color}
        fill={focused ? `${color}25` : 'none'}
        strokeWidth={focused ? 2.2 : 1.9}
      />
    ),
  },
  'check-in': {
    label: 'Pass',
    icon: (color, focused) => (
      <QrCode
        size={22}
        color={color}
        strokeWidth={focused ? 2.3 : 1.9}
      />
    ),
  },
  membership: {
    label: 'AI Coach',
    icon: (color, focused) => (
      <MessageSquare
        size={22}
        color={color}
        fill={focused ? color : 'none'}
        strokeWidth={focused ? 1.5 : 1.9}
      />
    ),
  },
  profile: {
    label: 'Profile',
    icon: (color, focused) => (
      <User
        size={22}
        color={color}
        fill={focused ? color : 'none'}
        strokeWidth={focused ? 1.5 : 1.9}
      />
    ),
  },
};

function CustomBottomTabBar(props: CustomBottomTabBarProps) {
  const { state, descriptors, insets, navigateToTab, emitter } = props;
  const activeColor = '#4F75E3'; // Signature periwinkle blue from reference mockup
  const inactiveColor = '#9CA3AF'; // Clean subtle grey

  return (
    <View style={[styles.barContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const config = TAB_CONFIGS[route.name] || {
          label: route.name,
          icon: (c: string) => <House size={22} color={c} />,
        };

        const onPress = () => {
          const event = emitter?.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && (!event || !event.defaultPrevented)) {
            navigateToTab(route.key);
          }
        };

        const onLongPress = () => {
          emitter?.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const itemColor = isFocused ? activeColor : inactiveColor;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={`${config.label} tab`}
            testID={descriptors[route.key]?.options?.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              {config.icon(itemColor, isFocused)}
            </View>

            <Text
              style={[
                styles.tabLabel,
                {
                  color: itemColor,
                  fontWeight: isFocused ? '700' : '500',
                },
              ]}
            >
              {config.label}
            </Text>

            {/* Micro-dot indicator centered beneath active label */}
            <View
              style={[
                styles.activeDot,
                {
                  backgroundColor: isFocused ? activeColor : 'transparent',
                  opacity: isFocused ? 1 : 0,
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomBottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
        }}
      />
      <Tabs.Screen
        name="check-in"
        options={{
          title: 'Pass',
        }}
      />
      <Tabs.Screen
        name="membership"
        options={{
          title: 'AI Coach',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.04)',
    paddingTop: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrap: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3.5,
    letterSpacing: 0.15,
  },
  activeDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    marginTop: 3,
  },
});
