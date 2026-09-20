import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  FileText,
  PieChart,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface TabBarItem {
  name: string;
  label: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
}

export const TAB_BAR_ITEMS: TabBarItem[] = [
  {
    name: 'index',
    label: 'Calendar',
    icon: ({ color, size }) => <CalendarIcon color={color} size={size} strokeWidth={1.5} />,
  },
  {
    name: 'tasks',
    label: 'Tasks',
    icon: ({ color, size }) => <CheckSquare color={color} size={size} strokeWidth={1.5} />,
  },
  {
    name: 'notes',
    label: 'Notes',
    icon: ({ color, size }) => <FileText color={color} size={size} strokeWidth={1.5} />,
  },
  {
    name: 'budget',
    label: 'Budget',
    icon: ({ color, size }) => <PieChart color={color} size={size} strokeWidth={1.5} />,
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: ({ color, size }) => <SettingsIcon color={color} size={size} strokeWidth={1.5} />,
  },
];

export interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  onAddPress?: () => void;
}

export function TabBar({ state, descriptors, navigation, onAddPress }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const baseDockHeight = 56;
  const totalHeight = baseDockHeight + insets.bottom;

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: totalHeight,
        paddingBottom: insets.bottom,
      }}
      className="flex-row items-center justify-around px-2"
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key] || {};
        const isFocused = state.index === index;

        const tabItem =
          TAB_BAR_ITEMS.find((t) => t.name === route.name) || {
            name: route.name,
            label: options?.title || route.name,
            icon: ({ color, size }: { color: string; size: number }) => (
              <CalendarIcon color={color} size={size} strokeWidth={1.5} />
            ),
          };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconColor = isFocused ? colors.primary : colors['text-muted'];

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options?.tabBarAccessibilityLabel || tabItem.label}
            testID={options?.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            className="flex-1 items-center justify-center py-1"
          >
            <View className="items-center justify-center h-7">
              {tabItem.icon({ color: iconColor, size: 20 })}
            </View>

            <Text
              style={{
                color: iconColor,
                fontSize: 10,
                fontWeight: isFocused ? '500' : '400',
                marginTop: 2,
              }}
            >
              {tabItem.label}
            </Text>

            {/* Understated 4px dot indicator for active tab */}
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                marginTop: 3,
                backgroundColor: isFocused ? colors.primary : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default TabBar;
