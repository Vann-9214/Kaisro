import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { notes, type Note } from '@/db/schema';
import { saveNote, deleteNote } from '@/db/noteActions';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { colors, spacing, layout } from '@/constants/theme';

export default function NoteEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const initialId = params.id ? parseInt(params.id, 10) : undefined;

  const [noteId, setNoteId] = useState<number | undefined>(
    Number.isNaN(initialId) ? undefined : initialId
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'ready'>('ready');
  const [timestampLabel, setTimestampLabel] = useState<string>('');

  const noteIdRef = useRef<number | undefined>(noteId);
  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  noteIdRef.current = noteId;
  titleRef.current = title;
  bodyRef.current = body;

  const formatTimestamp = (dateStr?: string | null) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    try {
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Load existing note on mount
  useEffect(() => {
    if (initialId && !Number.isNaN(initialId)) {
      try {
        const db = getDb();
        const row = db.select().from(notes).where(eq(notes.id, initialId)).get();
        if (row) {
          setTitle(row.title === 'Untitled Note' ? '' : row.title);
          setBody(row.body || '');
          titleRef.current = row.title === 'Untitled Note' ? '' : row.title;
          bodyRef.current = row.body || '';
          setTimestampLabel(formatTimestamp(row.updatedAt));
          setSaveStatus('saved');
        }
      } catch (err) {
        console.error('[NoteEditor] Failed to load note:', err);
      }
    } else {
      setTimestampLabel(formatTimestamp());
    }
  }, [initialId]);

  // Save current content immediately
  const flushSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (!isDirtyRef.current) return;

    const curTitle = titleRef.current.trim();
    const curBody = bodyRef.current.trim();
    const curId = noteIdRef.current;

    // Don't create an empty note if user didn't write anything
    if (!curTitle && !curBody && curId === undefined) {
      return;
    }

    try {
      const db = getDb();
      const saved = saveNote(
        db,
        { title: titleRef.current, body: bodyRef.current },
        curId
      );
      if (curId === undefined && saved?.id) {
        setNoteId(saved.id);
        noteIdRef.current = saved.id;
      }
      isDirtyRef.current = false;
      setSaveStatus('saved');
      setTimestampLabel(formatTimestamp(saved.updatedAt));
      useCalendarSync.getState().triggerRefresh();
    } catch (err) {
      console.error('[NoteEditor] Auto-save error:', err);
    }
  }, []);

  // Debounced auto-save trigger
  const scheduleAutoSave = useCallback(() => {
    isDirtyRef.current = true;
    setSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushSave();
    }, 600);
  }, [flushSave]);

  // Clean up and flush on unmount
  useEffect(() => {
    return () => {
      flushSave();
    };
  }, [flushSave]);

  // Intercept back button to flush before pop
  const handleBack = useCallback(() => {
    flushSave();
    router.back();
  }, [flushSave, router]);

  // Android hardware back button handler
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [handleBack]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    titleRef.current = val;
    scheduleAutoSave();
  };

  const handleBodyChange = (val: string) => {
    setBody(val);
    bodyRef.current = val;
    scheduleAutoSave();
  };

  const handleDelete = () => {
    const curId = noteIdRef.current;
    if (curId === undefined) {
      // Discard draft without saving
      isDirtyRef.current = false;
      router.back();
      return;
    }

    Alert.alert('Delete note?', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            isDirtyRef.current = false;
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }
            deleteNote(getDb(), curId);
            useCalendarSync.getState().triggerRefresh();
            router.back();
          } catch (err) {
            console.error('[NoteEditor] Delete error:', err);
            Alert.alert('Error', 'Could not delete note.');
          }
        },
      },
    ]);
  };

  const characterCount = body.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + spacing.xs,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>

        <View style={styles.statusContainer}>
          <Text
            maxFontSizeMultiplier={layout.maxFontScale}
            style={[styles.statusText, { color: colors['text-muted'] }]}
          >
            {saveStatus === 'saving'
              ? 'Saving...'
              : saveStatus === 'saved'
              ? 'Saved'
              : ''}
          </Text>
        </View>

        <Pressable
          onPress={handleDelete}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Delete note"
        >
          <Trash2 size={20} color={colors.error} />
        </Pressable>
      </View>

      {/* Expansive Notepad Canvas */}
      <KeyboardSafeScrollView
        style={styles.scrollFlex}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + 60,
          },
        ]}
      >
        {/* Seamless Large Title */}
        <TextInput
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Title"
          placeholderTextColor={colors['text-muted']}
          maxFontSizeMultiplier={layout.maxFontScale}
          style={[
            styles.titleInput,
            {
              color: colors.text,
              marginTop: spacing.md,
            },
          ]}
          returnKeyType="next"
          autoCapitalize="sentences"
        />

        {/* Date & Stats info line */}
        <View style={styles.metaRow}>
          <Text
            maxFontSizeMultiplier={layout.maxFontScale}
            style={[styles.metaText, { color: colors['text-muted'] }]}
          >
            {timestampLabel}
          </Text>
          <Text
            maxFontSizeMultiplier={layout.maxFontScale}
            style={[styles.metaText, { color: colors['text-muted'] }]}
          >
            {characterCount} {characterCount === 1 ? 'character' : 'characters'}
          </Text>
        </View>

        <View
          style={[
            styles.divider,
            {
              backgroundColor: colors.border,
              marginVertical: spacing.md,
            },
          ]}
        />

        {/* Full-Height Body Text Canvas */}
        <TextInput
          value={body}
          onChangeText={handleBodyChange}
          placeholder="Start typing your note..."
          placeholderTextColor={colors['text-muted']}
          multiline
          textAlignVertical="top"
          maxFontSizeMultiplier={layout.maxFontScale}
          style={[
            styles.bodyInput,
            {
              color: colors.text,
              minHeight: 380,
            },
          ]}
          autoCapitalize="sentences"
        />
      </KeyboardSafeScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  bodyInput: {
    fontSize: 16,
    lineHeight: 24,
    paddingTop: spacing.xs,
    paddingHorizontal: 0,
    flex: 1,
  },
});
