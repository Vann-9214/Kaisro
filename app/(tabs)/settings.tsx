import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { TopBar } from '@/components/ui/TopBar';
import { Chip } from '@/components/ui/Chip';
import { CURRENCY } from '@/constants/currency';
import { colors, spacing } from '@/constants/theme';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { FormCard, FormRow, SheetSection, SegmentedControl, Button } from '@/components/ui';
import { EditorSheet } from '@/components/ui/EditorSheet';
import { LiftedField } from '@/components/lifted-input';
import { notificationsAvailable, requestNotificationPermission, openNotificationSettings, openTimingSettings, openBatterySettings, syncNotifications, useNotificationStatus } from '@/notifications/service';
import type { PlannerPreferences } from '@/db/preferencesActions';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePreferencesStore(state => state.preferences);
  const updatePreferences = usePreferencesStore(state => state.update);
  const notificationStatus = useNotificationStatus(state => state.message);
  const [digestOpen, setDigestOpen] = useState(false);
  const [digestHour, setDigestHour] = useState('8');
  const [digestMinute, setDigestMinute] = useState('0');
  const update = (patch: Partial<PlannerPreferences>) => {
    try { updatePreferences(patch); void syncNotifications(); }
    catch { Alert.alert('Could not save settings', 'Please try again.'); }
  };
  const saveDigest = () => {
    if (!/^\d+$/.test(digestHour) || !/^\d+$/.test(digestMinute) || Number(digestHour) > 23 || Number(digestMinute) > 59) { Alert.alert('Choose a valid time', 'Hours: 0–23. Minutes: 0–59.'); return; }
    try { updatePreferences({ digestHour: Number(digestHour), digestMinute: Number(digestMinute) }); setDigestOpen(false); }
    catch { Alert.alert('Could not save settings', 'Please try again.'); }
  };

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  return (
    <View className="flex-1 bg-background">
      <TopBar featureName="Settings" />
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        <SheetSection gap="lg">
          <FormCard><SheetSection gap="sm"><Text style={{ color: colors.text }}>Appearance</Text>
            <SegmentedControl options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} selectedValue={prefs.theme} onChange={theme => update({ theme })} />
          </SheetSection></FormCard>
          <FormCard><SheetSection gap="sm"><Text style={{ color: colors.text }}>Notifications</Text>
            <Text style={{ color: colors['text-muted'] }}>{notificationStatus}</Text>
            <Button title="Enable notifications" onPress={async () => {
              if (!notificationsAvailable()) { Alert.alert('Development build needed', 'Install the native development build to enable notifications. The planner still works without them.'); return; }
              try { if (!await requestNotificationPermission()) Alert.alert('Permission is off', 'Allow notifications in your phone settings.'); }
              catch { Alert.alert('Could not enable notifications', 'Please try again.'); }
            }} />
            {(['eventReminders', 'taskReminders', 'dailyDigest', 'budgetAlerts', 'persistentTasks', 'escalatingTasks'] as const).filter(key => Platform.OS === 'android' || key !== 'persistentTasks').map(key => <FormRow key={key}
              label={{ eventReminders: 'Event reminders', taskReminders: 'Task reminders', dailyDigest: 'Daily digest', budgetAlerts: 'Budget alerts', persistentTasks: 'Tasks left in notification shade', escalatingTasks: 'Repeat ignored task reminders' }[key]}
              value={key === 'escalatingTasks' ? 'Up to 3 repeats, ending at the due day’s midnight.' : key === 'persistentTasks' ? 'Updates quietly. Stop from here or the notification.' : undefined}
              right={<Switch accessibilityLabel={key} value={prefs[key]} onValueChange={enabled => update({ [key]: enabled })} trackColor={{ true: colors.primary, false: colors.border }} />} />)}
            <FormCard compact onPress={() => { setDigestHour(String(prefs.digestHour)); setDigestMinute(String(prefs.digestMinute)); setDigestOpen(true); }}><FormRow label="Daily digest time" value={`${String(prefs.digestHour).padStart(2, '0')}:${String(prefs.digestMinute).padStart(2, '0')}`} /></FormCard>
            <Text style={{ color: colors.text }}>Budget warning threshold</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>{[70, 80, 90, 100].map(value => <Chip key={value} label={value + '%'} selected={prefs.budgetThreshold === value} onPress={() => update({ budgetThreshold: value })} />)}</View>
            {notificationsAvailable() && <Button title="Phone notification settings" variant="secondary" onPress={() => { void openNotificationSettings(); }} />}
            {Platform.OS === 'android' && notificationsAvailable() && <>
              <Button title="Allow exact reminder timing" variant="secondary" onPress={() => { void openTimingSettings(); }} />
              <Button title="Battery settings for reminders" variant="secondary" onPress={() => { void openBatterySettings(); }} />
            </>}
          </SheetSection></FormCard>
        </SheetSection>
        {/* Currency Card */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-text">Active Currency</Text>
            <Chip label={`${CURRENCY.symbol} (${CURRENCY.code})`} variant="money" size="sm" />
          </View>
          <Text className="text-xs text-text-muted leading-5">
            Configured globally as a single constant ({CURRENCY.name}). Stored in integer centavos to
            prevent floating-point roundoff issues.
          </Text>
        </Card>

        {/* Theming Information */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-text">Design System</Text>
            <Chip label={prefs.theme} variant="primary" size="sm" />
          </View>
          <Text className="text-xs text-text-muted leading-5 mb-2">
            Serene Editorial Minimal palette with Archival Ink Blue, Soft Teal, and Warm Sand. Dark
            mode follows your saved preference or your phone’s appearance.
          </Text>
        </Card>

        {/* Database & Privacy Card */}
        <Card className="mb-6">
          <Text className="text-sm font-medium text-text mb-2">Local SQLite Database</Text>
          <Text className="text-xs text-text-muted leading-5">
            Private, on-device SQLite database with Drizzle ORM. No analytics, tracking, or network
            connections.
          </Text>
        </Card>
      </ScrollView>
      <EditorSheet visible={digestOpen} onClose={() => setDigestOpen(false)} onSave={saveDigest} title="Daily digest time">
        <SheetSection><FormCard><LiftedField id="digest-hour" label="Hour (0–23)" keyboardType="number-pad" value={digestHour} onChangeText={setDigestHour} fieldOrder={['digest-hour', 'digest-minute']} /></FormCard>
          <FormCard><LiftedField id="digest-minute" label="Minute (0–59)" keyboardType="number-pad" value={digestMinute} onChangeText={setDigestMinute} fieldOrder={['digest-hour', 'digest-minute']} /></FormCard>
        </SheetSection>
      </EditorSheet>
    </View>
  );
}
