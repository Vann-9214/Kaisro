import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Receipt,
  FileText,
  X,
} from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useUIStore, QuickAddType } from '@/store/useUIStore';
import { EventForm } from '@/components/events/EventForm';
import { TaskForm } from '@/components/tasks/TaskForm';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { NoteForm } from '@/components/notes/NoteForm';
import {
  LiftedInputProvider,
  LiftedInputHost,
  useLiftedInput,
} from '@/components/lifted-input';
import { colors, spacing, layout } from '@/constants/theme';
import { QuickAddFormHandle } from '@/types/quickAdd';
import { SheetSaveFooter } from '@/components/ui/SheetSaveFooter';

const TABS: {
  type: QuickAddType;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { type: 'event', label: 'Event', icon: CalendarIcon },
  { type: 'task', label: 'Task', icon: CheckCircle2 },
  { type: 'transaction', label: 'Expense', icon: Receipt },
  { type: 'note', label: 'Note', icon: FileText },
];

function QuickAddBottomSheetContent() {
  const { closeBar } = useLiftedInput();
  const {
    isAddSheetOpen,
    closeAddSheet,
    activeAddType,
    setActiveAddType,
    editingEvent,
    editingTask,
    editingTransaction,
    editingNote,
    selectedDateContext,
  } = useUIStore();

  const [isSaving, setIsSaving] = useState(false);

  const eventFormRef = useRef<QuickAddFormHandle>(null);
  const taskFormRef = useRef<QuickAddFormHandle>(null);
  const expenseFormRef = useRef<QuickAddFormHandle>(null);
  const noteFormRef = useRef<QuickAddFormHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const isEditMode = Boolean(
    (activeAddType === 'event' && editingEvent) ||
    (activeAddType === 'task' && editingTask) ||
    (activeAddType === 'transaction' && editingTransaction) ||
    (activeAddType === 'note' && editingNote)
  );

  const getTitleText = () => {
    if (isEditMode) {
      switch (activeAddType) {
        case 'event':
          return 'Edit Event';
        case 'task':
          return 'Edit Task';
        case 'transaction':
          return 'Edit Budget Entry';
        case 'note':
          return 'Edit Note';
      }
    }
    return 'Quick Add';
  };

  const getButtonLabel = () => {
    if (isEditMode) {
      return 'Save changes';
    }
    switch (activeAddType) {
      case 'event':
        return 'Save Event';
      case 'task':
        return 'Save Task';
      case 'transaction':
        return 'Save Entry';
      case 'note':
        return 'Save Note';
    }
  };

  const getActiveFormRef = () => {
    switch (activeAddType) {
      case 'event':
        return eventFormRef;
      case 'task':
        return taskFormRef;
      case 'transaction':
        return expenseFormRef;
      case 'note':
        return noteFormRef;
    }
  };

  const handleClose = useCallback(() => {
    closeBar();
    closeAddSheet();
  }, [closeBar, closeAddSheet]);

  const handleTabPress = useCallback((type: QuickAddType) => {
    closeBar();
    setActiveAddType(type);
  }, [closeBar, setActiveAddType]);

  // Ensure bar is closed whenever sheet becomes hidden
  useEffect(() => {
    if (!isAddSheetOpen) {
      closeBar();
      setIsSaving(false);
    }
  }, [isAddSheetOpen, closeBar]);

  const handleSave = async () => {
    if (isSaving) return;
    const ref = getActiveFormRef();
    if (!ref.current) return;

    setIsSaving(true);
    try {
      await ref.current.submit();
    } catch (err) {
      console.error('[QuickAdd] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const buttonLabel = getButtonLabel();
  const titleText = getTitleText();

  // Fixed Header
  const fixedHeader = (
    <View
      style={{
        paddingHorizontal: layout.sheetHorizontalPadding, // 20dp
        paddingTop: layout.headerTopPadding,               // 20dp above header content
      }}
    >
      {/* Drag handle */}
      <View style={{ alignItems: 'center', marginBottom: layout.headerDragHandleBottom }}>
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: colors.border,
            borderRadius: 9999,
          }}
        />
      </View>

      {/* Title bar with hairline underneath */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: spacing.md, // 14dp padding inside title bar
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          ...(!isEditMode ? { marginBottom: 0 } : { marginBottom: layout.segmentedToCardGap }),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={layout.maxFontScale}
            style={{
              fontSize: 18,
              fontWeight: '500',
              color: colors.text,
            }}
          >
            {titleText}
          </Text>
          {selectedDateContext ? (
            <View
              style={{
                marginLeft: spacing.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 9999,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{
                  fontSize: 10,
                  fontWeight: '500',
                  color: colors['text-muted'],
                }}
              >
                {new Date(selectedDateContext + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Close button */}
        <Pressable
          onPress={handleClose}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            marginLeft: spacing.sm,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={14} color={colors.text} />
        </Pressable>
      </View>

      {/* Segmented Control (Event / Task / Expense / Note) */}
      {!isEditMode && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 9999,
            padding: spacing.xs,
            alignItems: 'center',
            marginTop: layout.headerToSegmentedGap, // 16dp between header and segmented control
            marginBottom: layout.segmentedToCardGap, // 16dp between segmented control and first card
          }}
        >
          {TABS.map((tab) => {
            const isSelected = tab.type === activeAddType;
            const IconComp = tab.icon;

            return (
              <Pressable
                key={tab.type}
                onPress={() => handleTabPress(tab.type)}
                style={{
                  flex: 1,
                  minHeight: 50,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.xs,
                  borderRadius: 9999,
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? colors.primary : 'transparent',
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${tab.label} tab`}
              >
                <IconComp
                  size={13}
                  color={isSelected ? colors['on-primary'] : colors['text-muted']}
                />
                <Text
                  maxFontSizeMultiplier={layout.maxFontScale}
                  style={{
                    marginTop: spacing.xs,
                    fontSize: 12,
                    fontWeight: '500',
                    color: isSelected ? colors['on-primary'] : colors['text-muted'],
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  const fixedFooter = <SheetSaveFooter label={buttonLabel} onPress={handleSave} saving={isSaving} />;

  return (
    <BottomSheet
      visible={isAddSheetOpen}
      onClose={handleClose}
      header={fixedHeader}
      footer={fixedFooter}
      hideDragHandle
      overlay={<LiftedInputHost footer={fixedFooter} />}
    >
      {/* Scrollable Body — explicit maxHeight so it never pushes the footer off screen.
          The footer always remains visible; content scrolls within this bounded area. */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, paddingHorizontal: layout.sheetHorizontalPadding }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        bounces={false}
        contentContainerStyle={{
          paddingBottom: layout.bodyBottomPadding,
        }}
      >
        {activeAddType === 'event' && (
          <EventForm
            ref={eventFormRef}
            onClose={handleClose}
            scrollViewRef={scrollViewRef}
          />
        )}
        {activeAddType === 'task' && (
          <TaskForm
            ref={taskFormRef}
            onClose={handleClose}
            scrollViewRef={scrollViewRef}
          />
        )}
        {activeAddType === 'transaction' && (
          <ExpenseForm
            ref={expenseFormRef}
            onClose={handleClose}
            scrollViewRef={scrollViewRef}
          />
        )}
        {activeAddType === 'note' && (
          <NoteForm
            ref={noteFormRef}
            onClose={handleClose}
            scrollViewRef={scrollViewRef}
          />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

export function QuickAddBottomSheet() {
  return (
    <LiftedInputProvider>
      <QuickAddBottomSheetContent />
    </LiftedInputProvider>
  );
}

export default QuickAddBottomSheet;
