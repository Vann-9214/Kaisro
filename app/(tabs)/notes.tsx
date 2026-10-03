import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sql } from 'drizzle-orm';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TopBar } from '@/components/ui/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SheetSection } from '@/components/ui/SheetSection';
import { FileText, Search, X } from 'lucide-react-native';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { filterNotes } from '@/db/noteActions';
import { colors, spacing, layout } from '@/constants/theme';

function formatNoteDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const isThisYear = d.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function NotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const [notesList, setNotesList] = useState<schema.Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
        .orderBy(sql`${schema.notes.updatedAt} DESC`);
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

  const displayedNotes = useMemo(() => {
    return filterNotes(notesList, searchQuery);
  }, [notesList, searchQuery]);

  const handleOpenNote = (id?: number) => {
    if (id !== undefined) {
      router.push({ pathname: '/note', params: { id } });
    } else {
      router.push('/note');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar featureName="Notes" />

      {/* Samsung Notes-Style Search Bar */}
      <View style={[styles.searchWrapper, { paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Search size={18} color={colors['text-muted']} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes..."
            placeholderTextColor={colors['text-muted']}
            maxFontSizeMultiplier={layout.maxFontScale}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {Boolean(searchQuery) && (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <X size={16} color={colors['text-muted']} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: bottomScrollPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SheetSection gap="lg">
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : notesList.length === 0 ? (
            <EmptyState
              variant="full"
              title="No notes yet"
              description="Your notebook is completely open."
              actionLabel="Add a note"
              icon={<FileText size={24} color={colors.primary} />}
              onAction={() => handleOpenNote()}
            />
          ) : displayedNotes.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={[styles.noResultsTitle, { color: colors.text }]}
              >
                No notes found
              </Text>
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={[styles.noResultsSubtitle, { color: colors['text-muted'] }]}
              >
                No notes match "{searchQuery}".
              </Text>
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchPressable}
                accessibilityRole="button"
                accessibilityLabel="Clear search filter"
              >
                <Text
                  maxFontSizeMultiplier={layout.maxFontScale}
                  style={[styles.clearSearchText, { color: colors.primary }]}
                >
                  Clear search
                </Text>
              </Pressable>
            </View>
          ) : (
            displayedNotes.map((note) => (
              <Card
                key={note.id}
                onPress={() => handleOpenNote(note.id)}
                accessibilityRole="button"
                accessibilityLabel={`Open note: ${note.title}`}
              >
                <View style={styles.cardHeader}>
                  <Text
                    numberOfLines={2}
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={[styles.noteTitle, { color: colors.text }]}
                  >
                    {note.title}
                  </Text>
                </View>

                {Boolean(note.body) && (
                  <Text
                    numberOfLines={3}
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={[styles.noteBody, { color: colors['text-muted'] }]}
                  >
                    {note.body}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={[styles.noteDate, { color: colors['text-muted'] }]}
                  >
                    {formatNoteDate(note.updatedAt || note.createdAt)}
                  </Text>
                </View>
              </Card>
            ))
          )}

          {notesList.length > 0 && displayedNotes.length > 0 && (
            <Button
              title="+ Add Note"
              variant="secondary"
              size="sm"
              onPress={() => handleOpenNote()}
            />
          )}
        </SheetSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollFlex: {
    flex: 1,
  },
  searchWrapper: {
    marginBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: layout.cardBorderRadius,
    borderWidth: layout.cardBorderWidth,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  noResultsSubtitle: {
    fontSize: 13,
    marginBottom: spacing.md,
  },
  clearSearchPressable: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  noteTitle: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  noteBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: spacing.xs,
  },
  noteDate: {
    fontSize: 11,
    fontWeight: '400',
  },
});
