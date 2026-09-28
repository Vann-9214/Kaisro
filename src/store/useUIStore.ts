import { create } from 'zustand';
import { Event, Task, Transaction, Note } from '@/db/schema';
import { formatDateToISO } from '@/utils/dateUtils';

export type QuickAddType = 'event' | 'task' | 'transaction' | 'note';

export type EditableItem = Event | Task | Transaction | Note;

interface UIState {
  isAddSheetOpen: boolean;
  activeAddType: QuickAddType;
  editingEvent: Event | null;
  editingTask: Task | null;
  editingTransaction: Transaction | null;
  editingNote: Note | null;
  selectedDateContext: string;
  selectedDate: string;
  viewedDate: string;
  taskDueAt: string | null;
  budgetMonth: string;
  setBudgetMonth: (month: string) => void;
  setTaskDueAt: (value: string | null) => void;
  setSelectedDate: (dateStr: string) => void;
  setViewedDate: (dateStr: string) => void;
  openAddSheet: (
    type?: QuickAddType,
    itemToEdit?: EditableItem | null,
    dateContext?: string
  ) => void;
  closeAddSheet: () => void;
  setActiveAddType: (type: QuickAddType) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddSheetOpen: false,
  activeAddType: 'event',
  editingEvent: null,
  editingTask: null,
  editingTransaction: null,
  editingNote: null,
  selectedDateContext: '',
  selectedDate: formatDateToISO(new Date()),
  viewedDate: formatDateToISO(new Date()),
  taskDueAt: null,
  budgetMonth: formatDateToISO(new Date()).slice(0, 7),
  setBudgetMonth: budgetMonth => set({ budgetMonth }),
  setTaskDueAt: taskDueAt => set({ taskDueAt }),
  setSelectedDate: (dateStr: string) =>
    set({ selectedDate: dateStr, selectedDateContext: dateStr, viewedDate: dateStr }),
  setViewedDate: (dateStr: string) => set({ viewedDate: dateStr }),
  openAddSheet: (type = 'event', itemToEdit = null, dateContext = '') => {
    let editingEvent: Event | null = null;
    let editingTask: Task | null = null;
    let editingTransaction: Transaction | null = null;
    let editingNote: Note | null = null;

    if (itemToEdit) {
      if (type === 'event') editingEvent = itemToEdit as Event;
      else if (type === 'task') editingTask = itemToEdit as Task;
      else if (type === 'transaction') editingTransaction = itemToEdit as Transaction;
      else if (type === 'note') editingNote = itemToEdit as Note;
    }

    set({
      isAddSheetOpen: true,
      activeAddType: type,
      editingEvent,
      editingTask,
      editingTransaction,
      editingNote,
      selectedDateContext: dateContext,
      taskDueAt: editingTask ? editingTask.dueAt : dateContext || null,
    });
  },
  closeAddSheet: () =>
    set({
      isAddSheetOpen: false,
      editingEvent: null,
      editingTask: null,
      editingTransaction: null,
      editingNote: null,
    }),
  setActiveAddType: (type) => set({ activeAddType: type }),
}));
