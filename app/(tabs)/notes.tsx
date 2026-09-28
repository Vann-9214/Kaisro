import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sql } from 'drizzle-orm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SheetSection } from '@/components/ui/SheetSection';
import { FileText } from 'lucide-react-native';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { colors, spacing, layout } from '@/constants/theme';

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
    <View className="flex-1 bg-background">
      <TopBar featureName="Notes" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomScrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        <SheetSection gap="lg">
        {isLoading ? (
          <View className="py-8 items-center justify-center">
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : notesList.length === 0 ? (
          <EmptyState variant="full" title="No notes yet" description="Your notebook is completely open." actionLabel="Add a note" icon={<FileText size={24} color={colors.primary} />} onAction={() => openAddSheet('note')} />
        ) : (
          notesList.map((note) => (
            <Card
              key={note.id}
              onPress={() => openAddSheet('note', note)}
              accessibilityRole="button"
              accessibilityLabel={`Edit note: ${note.title}`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <Text numberOfLines={2} maxFontSizeMultiplier={layout.maxFontScale} style={{ flexShrink: 1 }} className="text-base font-medium text-text">{note.title}</Text>
              </View>
              {Boolean(note.body) && (
                <Text numberOfLines={3} maxFontSizeMultiplier={layout.maxFontScale} className="text-xs text-text-muted leading-5 mb-2">
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
        </SheetSection>
      </ScrollView>
    </View>
  );
}
