import React, { useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Alert,
  Pressable,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { FileText, Tag as TagIcon } from 'lucide-react-native';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { useUIStore } from '@/store/useUIStore';
import { colors, spacing, layout } from '@/constants/theme';
import { FormCard } from '@/components/ui';
import { LiftedField } from '@/components/lifted-input/LiftedField';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export type NoteFormProps = QuickAddFormProps;

interface FormValues {
  title: string;
  body: string;
  tag: string;
}

const NOTE_FIELD_ORDER = ['title', 'body', 'tag'];

export const NoteForm = React.forwardRef<QuickAddFormHandle, NoteFormProps>(
  function NoteForm({ onClose, scrollViewRef }, ref) {
    const { editingNote } = useUIStore();
    const isEditMode = Boolean(editingNote);

    const {
      control,
      handleSubmit,
      setValue,
      clearErrors,
      formState: { errors },
    } = useForm<FormValues>({
      defaultValues: {
        title: editingNote?.title || '',
        body: editingNote?.body || '',
        tag: '',
      },
    });

    useEffect(() => {
      if (editingNote) {
        setValue('title', editingNote.title);
        setValue('body', editingNote.body || '');
        (async () => {
          try {
            const db = getDb();
            const links = await db
              .select()
              .from(schema.noteTags)
              .where(eq(schema.noteTags.noteId, editingNote.id));
            if (links.length > 0) {
              const [t] = await db
                .select()
                .from(schema.tags)
                .where(eq(schema.tags.id, links[0].tagId));
              if (t) setValue('tag', t.name);
            }
          } catch (e) {
            console.error('[NoteForm] Failed to load note tags:', e);
          }
        })();
      }
    }, [editingNote, setValue]);

    const onSubmit = async (data: FormValues) => {
      const trimmedTitle = data.title.trim();
      const trimmedBody = data.body.trim();
      const trimmedTag = data.tag.trim();

      try {
        const db = getDb();
        const now = new Date().toISOString();

        if (isEditMode && editingNote) {
          await db
            .update(schema.notes)
            .set({
              title: trimmedTitle || 'Untitled Note',
              body: trimmedBody,
              updatedAt: now,
            })
            .where(eq(schema.notes.id, editingNote.id));

          // Clear old tag links
          await db.delete(schema.noteTags).where(eq(schema.noteTags.noteId, editingNote.id));

          if (trimmedTag) {
            const existingTags = await db.select().from(schema.tags);
            let tagRecord = existingTags.find((t) => t.name.toLowerCase() === trimmedTag.toLowerCase());
            if (!tagRecord) {
              const [inserted] = await db
                .insert(schema.tags)
                .values({ name: trimmedTag })
                .returning();
              tagRecord = inserted;
            }
            if (tagRecord) {
              await db.insert(schema.noteTags).values({
                noteId: editingNote.id,
                tagId: tagRecord.id,
              });
            }
          }
        } else {
          const [newNote] = await db
            .insert(schema.notes)
            .values({
              title: trimmedTitle || 'Untitled Note',
              body: trimmedBody,
            })
            .returning();

          if (trimmedTag && newNote) {
            const existingTags = await db.select().from(schema.tags);
            let tagRecord = existingTags.find((t) => t.name.toLowerCase() === trimmedTag.toLowerCase());
            if (!tagRecord) {
              const [inserted] = await db
                .insert(schema.tags)
                .values({ name: trimmedTag })
                .returning();
              tagRecord = inserted;
            }
            if (tagRecord) {
              await db.insert(schema.noteTags).values({
                noteId: newNote.id,
                tagId: tagRecord.id,
              });
            }
          }
        }

        useCalendarSync.getState().triggerRefresh();
        onClose();
      } catch (err) {
        console.error('[NoteForm] Failed to save note:', err);
        Alert.alert('Error', 'Failed to save note.');
        throw err;
      }
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        let success = false;
        await handleSubmit(
          async (data) => {
            await onSubmit(data);
            success = true;
          },
          () => {
            scrollViewRef?.current?.scrollTo({ y: 0, animated: true });
            success = false;
          }
        )();
        return success;
      },
    }));

    const handleDelete = () => {
      if (!editingNote) return;
      Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDb();
              await db.delete(schema.notes).where(eq(schema.notes.id, editingNote.id));
              useCalendarSync.getState().triggerRefresh();
              onClose();
            } catch (err) {
              console.error('[NoteForm] Failed to delete note:', err);
              Alert.alert('Error', 'Failed to delete note.');
            }
          },
        },
      ]);
    };

    return (
      <View style={{ gap: layout.cardGap }}>
        {/* 1. Note Title Lifted Field Card */}
        <FormCard singleLine>
          <Controller
            control={control}
            name="title"
            rules={{ required: 'Note title is required' }}
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="title"
                label="Note Title"
                value={value}
                onChangeText={(val) => {
                  onChange(val);
                  if (val.trim()) clearErrors('title');
                }}
                placeholder="Note title (e.g. Architecture reflections)"
                hint="Tap to add a note title"
                error={errors.title?.message}
                fieldOrder={NOTE_FIELD_ORDER}
                icon={<FileText size={16} color={colors.primary} />}
              />
            )}
          />
        </FormCard>

        {/* 2. Note Body Lifted Field Card (Multi-line with 2-line preview in form) */}
        <FormCard style={{ minHeight: 90 }}>
          <Text
            maxFontSizeMultiplier={layout.maxFontScale}
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: colors['text-muted'],
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: spacing.xs,
            }}
          >
            Content
          </Text>
          <Controller
            control={control}
            name="body"
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="body"
                label="Note Content"
                value={value}
                onChangeText={onChange}
                placeholder="Tap to write note content..."
                multiline
                fieldOrder={NOTE_FIELD_ORDER}
              />
            )}
          />
        </FormCard>

        {/* 3. Note Tag Lifted Field Card */}
        <FormCard singleLine>
          <Controller
            control={control}
            name="tag"
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="tag"
                label="Tag"
                value={value}
                onChangeText={onChange}
                placeholder="Add tag (e.g. Ideas, Design)"
                fieldOrder={NOTE_FIELD_ORDER}
                icon={<TagIcon size={14} color={colors['text-muted']} />}
              />
            )}
          />
        </FormCard>

        {/* Delete Button in Edit Mode */}
        {isEditMode && (
          <View
            style={{
              marginTop: layout.deleteButtonTopMargin,
              marginBottom: layout.deleteButtonBottomMargin,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              onPress={handleDelete}
              style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.base }}
              accessibilityRole="button"
              accessibilityLabel="Delete note"
            >
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: colors.error,
                }}
              >
                Delete note
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

export default NoteForm;
