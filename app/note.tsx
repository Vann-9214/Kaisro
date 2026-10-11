import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Alert, AppState } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eq } from 'drizzle-orm';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { getDb, notes, events, tasks, transactions } from '@/db';
import { useUIStore } from '@/store/useUIStore';
import { saveNote, deleteNote, readNoteTags, type NoteDraft } from '@/db/noteActions';
import { readNoteTargets } from '@/db/linkActions';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { KeyboardSafeScrollView } from '@/components/ui/KeyboardSafeScrollView';
import { FormCard, FormRow, SheetSection, Chip } from '@/components/ui';
import { NoteTargetPicker } from '@/components/notes/LinkPicker';
import { FormattedNote } from '@/components/notes/FormattedNote';
import { formatNoteSelection, type NoteFormat } from '@/utils/noteFormatting';
import { colors, spacing } from '@/constants/theme';

type Draft = Required<Pick<NoteDraft, 'title' | 'body' | 'pinned' | 'favorite' | 'tags' | 'links'>>;
const blank = (): Draft => ({ title: '', body: '', pinned: false, favorite: false, tags: [], links: [] });
export default function NoteEditorScreen() {
  useThemeRefresh();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const [draft, setDraft] = useState<Draft>(blank);
  const [status, setStatus] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState(false);
  const [tagText, setTagText] = useState('');
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const draftRef = useRef(draft);
  const idRef = useRef<number | undefined>(undefined);
  const dirtyRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (!dirtyRef.current) return true;
    const current = draftRef.current;
    if (idRef.current === undefined && !current.title.trim() && !current.body.trim() && !current.links.length && !current.tags.some(tag => tag.trim())) { dirtyRef.current = false; setStatus(''); return true; }
    try {
      const note = saveNote(getDb(), current, idRef.current);
      idRef.current = note.id; dirtyRef.current = false; setStatus('Saved');
      useCalendarSync.getState().triggerRefresh();
      return true;
    } catch { setStatus('Save failed — your draft is still here'); return false; }
  }, []);
  useEffect(() => {
    const id = params.id ? Number(params.id) : undefined;
    if (!flush()) return;
    let next = blank();
    idRef.current = id;
    if (id !== undefined) {
      const note = Number.isSafeInteger(id) ? getDb().select().from(notes).where(eq(notes.id, id)).get() : undefined;
      if (!note) { setLoaded(false); Alert.alert('Note unavailable', 'This note no longer exists.', [{ text: 'Back', onPress: () => router.back() }]); return; }
      next = { title: note.title, body: note.body, pinned: note.pinned, favorite: note.favorite, tags: readNoteTags(getDb(), id), links: readNoteTargets(getDb(), id) };
    }
    draftRef.current = next; setDraft(next); setTagText(next.tags.join(', ')); setLoaded(true); setStatus(id ? 'Saved' : '');
  }, [params.id, flush, router]);
  useEffect(() => {
    const remove = navigation.addListener('beforeRemove', event => {
      if (!flush()) { event.preventDefault(); Alert.alert('Could not save note', 'Your draft is kept open. Try again before leaving.'); }
    });
    const lifecycle = AppState.addEventListener('change', state => { if (state !== 'active') flush(); });
    return () => { remove(); lifecycle.remove(); flush(); };
  }, [navigation, flush]);
  const change = (patch: Partial<Draft>) => {
    const next = { ...draftRef.current, ...patch }; draftRef.current = next; setDraft(next); dirtyRef.current = true; setStatus('Saving…');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 600);
  };
  const applyFormat = (format: NoteFormat) => {
    const result = formatNoteSelection(draft.body, selection, format); change({ body: result.body }); setSelection(result.selection);
  };
  const remove = () => Alert.alert('Delete note?', 'This removes the note and its links.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Delete', onPress: () => {
      try { if (idRef.current !== undefined) deleteNote(getDb(), idRef.current); dirtyRef.current = false; if (timer.current) clearTimeout(timer.current); useCalendarSync.getState().triggerRefresh(); router.back(); }
      catch { Alert.alert('Could not delete note', 'Please try again.'); }
    } },
  ]);
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => { if (flush()) router.back(); }} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><ArrowLeft color={colors.text} /></Pressable>
      <Text style={{ color: colors['text-muted'], flex: 1 }}>{status}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Save note" onPress={flush} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary }}>Save</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Delete note" onPress={remove} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Trash2 color={colors['text-muted']} size={20} /></Pressable>
    </View>
    {loaded && <KeyboardSafeScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      <SheetSection>
        <TextInput value={draft.title} onChangeText={title => change({ title })} placeholder="Title" placeholderTextColor={colors['text-muted']} style={{ color: colors.text, fontSize: 24 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <Chip label="Pinned" selected={draft.pinned} onPress={() => change({ pinned: !draft.pinned })} />
          <Chip label="Favorite" selected={draft.favorite} onPress={() => change({ favorite: !draft.favorite })} />
          <Chip label={preview ? 'Edit text' : 'Preview'} selected={preview} onPress={() => setPreview(value => !value)} />
        </View>
        <FormCard compact><FormRow label="Tags (comma separated)" /><TextInput value={tagText} onChangeText={text => { setTagText(text); change({ tags: text.split(',') }); }} placeholder="Ideas, Personal" placeholderTextColor={colors['text-muted']} style={{ color: colors.text, minHeight: 44 }} /></FormCard>
        <NoteTargetPicker selected={draft.links} onChange={links => change({ links })} />
        {draft.links.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{draft.links.map(link => {
          const db = getDb();
          const item = link.targetType === 'event' ? db.select().from(events).where(eq(events.id, link.targetId)).get()
            : link.targetType === 'task' ? db.select().from(tasks).where(eq(tasks.id, link.targetId)).get()
            : db.select().from(transactions).where(eq(transactions.id, link.targetId)).get();
          if (!item) return null;
          return <Chip key={link.targetType + ':' + link.targetId} label={'Open ' + link.targetType + ': ' + ('title' in item ? item.title : item.note || 'Entry')} onPress={() => {
            if (!flush()) return;
            if (router.canGoBack()) router.back(); else router.replace('/(tabs)/notes');
            useUIStore.getState().openAddSheet(link.targetType, item);
          }} />;
        })}</View>}
        {!preview && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{(['bold', 'italic', 'heading', 'list'] as NoteFormat[]).map(format => <Chip key={format} label={format} onPress={() => applyFormat(format)} />)}</View>}
        {preview ? <FormattedNote body={draft.body} /> : <TextInput value={draft.body} onChangeText={body => change({ body })} onSelectionChange={event => setSelection(event.nativeEvent.selection)}
          placeholder="Write a note…" placeholderTextColor={colors['text-muted']} multiline textAlignVertical="top" style={{ color: colors.text, fontSize: 16, lineHeight: 24, minHeight: 260 }} />}
      </SheetSection>
    </KeyboardSafeScrollView>}
  </View>;
}
