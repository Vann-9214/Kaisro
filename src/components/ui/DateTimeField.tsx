import React, { useState } from 'react';
import { View, Pressable, Text, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Clock } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';
import { formatDateToISO, formatLocalDateTime, parseISODate } from '@/utils/dateUtils';
import { useLiftedInput } from '@/components/lifted-input';
import { FormCard, FormCardRow } from './FormCard';
import { FormRow } from './FormRow';
import { SheetSection } from './SheetSection';

/** The date value is controlled by the existing UI store; only picker visibility is local. */
export function DateTimeField({ value, onChange, optional = false, fallbackDate }: {
  value: string | null; onChange: (value: string | null) => void; optional?: boolean; fallbackDate: string;
}) {
  const [mode, setMode] = useState<'date' | 'time' | null>(null);
  const { closeBar } = useLiftedInput();
  const hasTime = Boolean(value?.includes('T'));
  const date = value ? (hasTime ? new Date(value) : parseISODate(value)) : parseISODate(fallbackDate);
  const open = (next: 'date' | 'time') => { closeBar(); setMode(next); };
  return <SheetSection gap="sm">
    <FormCardRow style={{ gap: spacing.cardGap }}>
      <FormCard style={{ flex: 1 }} onPress={() => open('date')}><FormRow icon={<Calendar color={colors['text-muted']} size={16} />} label={optional ? 'Due date' : 'Date'} value={value ? date.toLocaleDateString() : 'No date'} /></FormCard>
      <FormCard style={{ flex: 1 }} onPress={() => open('time')}><FormRow icon={<Clock color={colors['text-muted']} size={16} />} label="Time" value={hasTime ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Anytime'} /></FormCard>
    </FormCardRow>
    {optional && value && <View style={{ flexDirection: 'row', gap: spacing.md }}>
      <Pressable onPress={() => onChange(null)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors['text-muted'] }}>Clear date</Text></Pressable>
      {hasTime && <Pressable onPress={() => onChange(formatDateToISO(date))} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors['text-muted'] }}>Clear time</Text></Pressable>}
    </View>}
    {mode && <FormCard>
      <DateTimePicker value={date} mode={mode} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, picked) => {
        if (Platform.OS === 'android') setMode(null);
        if (event.type === 'dismissed' || !picked) return;
        const next = new Date(date);
        if (mode === 'date') next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
        else next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
        onChange(mode === 'time' || hasTime || !optional ? formatLocalDateTime(next) : formatDateToISO(next));
      }} />
      {Platform.OS === 'ios' && <Pressable onPress={() => setMode(null)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, padding: spacing.sm }}>Done</Text></Pressable>}
    </FormCard>}
  </SheetSection>;
}
