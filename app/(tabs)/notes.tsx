import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sql } from 'drizzle-orm';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { colors } from '@/constants/theme';

export default function NotesScreen() {
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();
  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const [notesList, setNotesList] = useState<schema.Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.notes)
        .orderBy(sql`${schema.notes.createdAt} DESC`);
      setNotesList(rows);
    } catch (e) {
      console.error('[NotesScreen Error]', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, refreshCounter]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Reflections & Context
          </Text>
          <Text className="text-2xl font-medium text-text">Notes</Text>
        </View>

        {/* Notes Content */}
        {isLoading ? (
          <View className="py-8 items-center justify-center">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : notesList.length === 0 ? (
          <Card className="mb-4">
            <Text className="text-sm font-medium text-text mb-1">No notes yet</Text>
            <Text className="text-xs text-text-muted leading-5">
              Your notebook is completely open. Tap "+ Add Note" to capture your reflections and thoughts.
            </Text>
          </Card>
        ) : (
          notesList.map((note) => (
            <Card key={note.id} className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-medium text-text">{note.title}</Text>
              </View>
              {Boolean(note.body) && (
                <Text className="text-xs text-text-muted leading-5 mb-2">
                  {note.body}
                </Text>
              )}
            </Card>
          ))
        )}

        <Button
          title="+ Add Note"
          variant="secondary"
          size="sm"
          onPress={() => openAddSheet('note')}
        />
      </ScrollView>
    </View>
  );
}
