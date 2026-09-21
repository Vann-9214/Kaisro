import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, DollarSign, CheckSquare, MapPin, Tag } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/theme';

export default function DetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    type?: string;
    id?: string;
    title?: string;
    subtitle?: string;
    amount?: string;
    location?: string;
    category?: string;
    note?: string;
  }>();

  const type = (params.type || 'event') as 'event' | 'expense' | 'task';
  const title = params.title || 'Untitled';
  const subtitle = params.subtitle;
  const amount = params.amount;
  const location = params.location;
  const category = params.category;
  const note = params.note;

  const getModuleConfig = () => {
    switch (type) {
      case 'event':
        return {
          module: 'calendar' as const,
          chipVariant: 'primary' as const,
          badgeLabel: 'Calendar Event',
          icon: <Calendar size={18} color={colors.primary} />,
        };
      case 'expense':
        return {
          module: 'money' as const,
          chipVariant: 'money' as const,
          badgeLabel: 'Expense Entry',
          icon: <DollarSign size={18} color={colors['on-money']} />,
        };
      case 'task':
        return {
          module: 'tasks' as const,
          chipVariant: 'tasks' as const,
          badgeLabel: 'Daily Task',
          icon: <CheckSquare size={18} color={colors.tasks} />,
        };
    }
  };

  const config = getModuleConfig();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {/* Navigation Bar */}
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-background">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full active:bg-surface border border-border"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <Text className="ml-3 text-lg font-medium text-text">Detail View</Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-5"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Entity Card */}
        <Card module={config.module} elevated className="mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              {config.icon}
              <Text className="ml-2 text-xs font-medium text-text-muted uppercase tracking-wider">
                {config.badgeLabel}
              </Text>
            </View>
            <Chip label={`ID #${params.id ?? '1'}`} variant={config.chipVariant} size="sm" />
          </View>

          <Text className="text-xl font-medium text-text leading-7 mb-2">{title}</Text>

          {subtitle && (
            <Text className="text-sm text-text-muted font-normal mb-3">{subtitle}</Text>
          )}

          {amount && (
            <View className="mt-2 p-3 bg-background rounded-lg border border-border flex-row items-center justify-between">
              <Text className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Total Amount
              </Text>
              <Text className="text-xl font-semibold text-on-money tabular-nums">{amount}</Text>
            </View>
          )}

          {category && (
            <View className="mt-3 flex-row items-center">
              <Tag size={14} color={colors['text-muted']} />
              <Text className="ml-2 text-xs text-text-muted">Category: {category}</Text>
            </View>
          )}

          {location && (
            <View className="mt-3 flex-row items-center">
              <MapPin size={14} color={colors['text-muted']} />
              <Text className="ml-2 text-xs text-text-muted">Location: {location}</Text>
            </View>
          )}

          {note && (
            <View className="mt-4 pt-3 border-t border-border">
              <Text className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                Note / Memo
              </Text>
              <Text className="text-sm text-text leading-5">{note}</Text>
            </View>
          )}
        </Card>

        {/* Informative Sanctuary Card */}
        <Card className="mb-6">
          <Text className="text-sm font-medium text-text mb-1">Placeholder Detail Screen</Text>
          <Text className="text-xs text-text-muted leading-5">
            This screen provides a dedicated focus space for your daily entries. Full inline editing,
            recurrence management, and note linking will be connected here in the upcoming iteration.
          </Text>
        </Card>

        <Button
          title="Back to Day View"
          variant="primary"
          size="md"
          onPress={() => router.back()}
        />
      </ScrollView>
    </View>
  );
}
