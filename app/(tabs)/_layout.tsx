import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar } from '@/components/ui/TabBar';
import { FloatingAddButton } from '@/components/ui/FloatingAddButton';
import { useUIStore } from '@/store/useUIStore';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();

  // Tab bar base dock height is 56px, plus insets.bottom.
  // FAB sits cleanly 16px above the tab bar top edge.
  const fabBottomOffset = 56 + insets.bottom + 16;

  return (
    <View style={styles.container}>
      <Tabs
        tabBar={(props) => <TabBar {...props} onAddPress={() => openAddSheet()} />}
        screenOptions={{
          headerShown: false,
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

      {/* Floating Add Button (FAB) anchored above bottom dock respecting safe-area insets */}
      <View
        style={[styles.fabContainer, { bottom: fabBottomOffset }]}
        pointerEvents="box-none"
      >
        <FloatingAddButton onPress={() => openAddSheet('event')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
  },
});
