import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useState } from 'react';
import { Text, ScrollView, Pressable } from 'react-native';
import { FormCard, FormRow, SheetSection, BottomSheet, Checkbox } from '@/components/ui';
import { getDb, events, tasks, transactions, notes } from '@/db';
import { colors, spacing, layout } from '@/constants/theme';
import { formatCurrency } from '@/constants/currency';
import type { NoteTarget } from '@/db/linkActions';

interface Choice { key: string; title: string; detail?: string }
function Choices({ label, choices, selected, onChange }: { label: string; choices: Choice[]; selected: string[]; onChange: (keys: string[]) => void }) {
  useThemeRefresh();
  const [open, setOpen] = useState(false);
  choices = [...choices, ...selected.filter(key => !choices.some(choice => choice.key === key)).map(key => ({ key, title: 'Removed item', detail: 'Uncheck to remove this stale link.' }))];
  return <>
    <FormCard compact onPress={() => setOpen(true)} accessibilityLabel={label}>
      <FormRow label={label} value={selected.length ? choices.filter(choice => selected.includes(choice.key)).map(choice => choice.title).join(', ') : 'None'} />
    </FormCard>
    <BottomSheet visible={open} onClose={() => setOpen(false)} title={<FormRow label={label} right={<Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary }}>Done</Text></Pressable>} />}>
      <ScrollView contentContainerStyle={{ padding: layout.sheetHorizontalPadding, paddingBottom: spacing.xl }}>
        <SheetSection>{choices.length ? choices.map(choice => <FormCard compact key={choice.key} onPress={() => onChange(selected.includes(choice.key) ? selected.filter(key => key !== choice.key) : [...selected, choice.key])}>
          <FormRow label={choice.title} value={choice.detail} right={<Checkbox checked={selected.includes(choice.key)} onToggle={() => onChange(selected.includes(choice.key) ? selected.filter(key => key !== choice.key) : [...selected, choice.key])} />} />
        </FormCard>) : <Text style={{ color: colors['text-muted'] }}>No items available yet.</Text>}</SheetSection>
      </ScrollView>
    </BottomSheet>
  </>;
}
export function EntityNotePicker({ selected, onChange }: { selected: number[]; onChange: (ids: number[]) => void }) {
  useThemeRefresh();
  const choices = getDb().select().from(notes).all().map(note => ({ key: String(note.id), title: note.title }));
  return <Choices label="Linked notes" choices={choices} selected={selected.map(String)} onChange={keys => onChange(keys.map(Number))} />;
}
export function EventLinkPicker({ selected, onChange }: { selected: number | null; onChange: (id: number | null) => void }) {
  useThemeRefresh();
  const choices = getDb().select().from(events).all().map(event => ({ key: String(event.id), title: event.title, detail: event.start.slice(0, 10) }));
  return <Choices label="Linked calendar event" choices={choices} selected={selected === null ? [] : [String(selected)]} onChange={keys => onChange(keys.length ? Number(keys[keys.length - 1]) : null)} />;
}
export function NoteTargetPicker({ selected, onChange }: { selected: NoteTarget[]; onChange: (targets: NoteTarget[]) => void }) {
  useThemeRefresh();
  const db = getDb();
  const choices = [
    ...db.select().from(events).all().map(event => ({ key: 'event:' + event.id, title: event.title, detail: 'Event · ' + event.start.slice(0, 10) })),
    ...db.select().from(tasks).all().map(task => ({ key: 'task:' + task.id, title: task.title, detail: 'Task · ' + (task.dueAt?.slice(0, 10) ?? 'No date') })),
    ...db.select().from(transactions).all().map(entry => ({ key: 'transaction:' + entry.id, title: entry.note || formatCurrency(entry.amount), detail: 'Entry · ' + entry.date.slice(0, 10) })),
  ];
  return <Choices label="Linked items" choices={choices} selected={selected.map(target => target.targetType + ':' + target.targetId)} onChange={keys => onChange(keys.map(key => {
    const [targetType, id] = key.split(':'); return { targetType: targetType as NoteTarget['targetType'], targetId: Number(id) };
  }))} />;
}
