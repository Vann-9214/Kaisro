import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, Animated } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from '@/components/ui/TabBar';
import { FloatingAddButton } from '@/components/ui/FloatingAddButton';
import { useUIStore } from '@/store/useUIStore';
import { colors, tabDockHeight, createThemedStyles } from '@/constants/theme';

export default function TabLayout() {
  useThemeRefresh();
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();

  const handleFabPress = () => {
    if (pathname === '/notes') {
      openAddSheet('note');
    } else if (pathname === '/tasks') {
      openAddSheet('task');
    } else if (pathname === '/budget') {
      openAddSheet('transaction');
    } else {
      openAddSheet('event');
    }
  };

  // Tab bar base dock height is 56px, plus insets.bottom.
  // FAB sits cleanly 16px above the tab bar top edge.
  const fabBottomOffset = tabDockHeight(fontScale) + insets.bottom + 16;
  const isSettings = pathname === '/settings';
  const fabScale = useRef(new Animated.Value(isSettings ? 0 : 1)).current;
  const fabOpacity = useRef(new Animated.Value(isSettings ? 0 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fabScale, {
        toValue: isSettings ? 0 : 1,
        damping: 20,
        stiffness: 260,
        useNativeDriver: true,
      }),
      Animated.timing(fabOpacity, {
        toValue: isSettings ? 0 : 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSettings, fabScale, fabOpacity]);

  const renderTabBar = useCallback(
    (props: any) => <TabBar {...props} onAddPress={() => openAddSheet()} />,
    [openAddSheet]
  );

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={renderTabBar}
        screenOptions={{
          headerShown: false,
          lazy: false,
          animation: 'none',
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Calendar',
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: 'Notes',
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: 'Budget',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
          }}
        />
      </Tabs>

      {/* Floating Add Button (FAB) anchored above bottom dock respecting safe-area insets, animated out on Settings */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: fabBottomOffset,
            pointerEvents: isSettings ? 'none' : 'box-none',
            opacity: fabOpacity,
            transform: [{ scale: fabScale }],
          },
        ]}
      >
        <FloatingAddButton onPress={handleFabPress} />
      </Animated.View>
    </View>
  );
}

const styles = createThemedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
  },
}));
