import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  FileText,
  PieChart,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import { colors, layout, tabDockHeight } from '@/constants/theme';
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

export const TabBar = React.memo(function TabBar({ state, descriptors, navigation, onAddPress }: CustomTabBarProps) {
  useThemeRefresh();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const baseDockHeight = tabDockHeight(fontScale);
  const totalHeight = baseDockHeight + insets.bottom;

  return (
    <View
      style={{
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: totalHeight,
        paddingBottom: insets.bottom,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 8,
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
            style={{ minHeight: 44 }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 3,
                borderRadius: 9999,
                backgroundColor: isFocused ? colors.surface : 'transparent',
                borderWidth: isFocused ? 1 : 0,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: isFocused ? colors.text : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isFocused ? 0.04 : 0,
                shadowRadius: 2,
                elevation: isFocused ? 1 : 0,
              }}
            >
              {tabItem.icon({ color: iconColor, size: 20 })}
            </View>

            <Text
              maxFontSizeMultiplier={layout.maxFontScale}
              numberOfLines={1}
              style={{
                color: iconColor,
                fontSize: 10,
                fontWeight: isFocused ? '600' : '400',
                marginTop: 2,
                letterSpacing: isFocused ? -0.1 : 0,
              }}
            >
              {tabItem.label}
            </Text>

            {/* Active indicator dot */}
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                marginTop: 2,
                backgroundColor: isFocused ? colors.primary : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
});

export default TabBar;
