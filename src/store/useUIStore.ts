import { create } from 'zustand';
import { Event } from '@/db/schema';
import { formatDateToISO } from '@/utils/dateUtils';

export type QuickAddType = 'event' | 'task' | 'transaction' | 'note';

interface UIState {
  isAddSheetOpen: boolean;
  activeAddType: QuickAddType;
  editingEvent: Event | null;
  selectedDateContext: string;
  selectedDate: string;
  viewedDate: string;
  setSelectedDate: (dateStr: string) => void;
  setViewedDate: (dateStr: string) => void;
  openAddSheet: (
    type?: QuickAddType,
    eventToEdit?: Event | null,
    dateContext?: string
  ) => void;
  closeAddSheet: () => void;
  setActiveAddType: (type: QuickAddType) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddSheetOpen: false,
  activeAddType: 'event',
  editingEvent: null,
  selectedDateContext: '',
  selectedDate: formatDateToISO(new Date()),
  viewedDate: formatDateToISO(new Date()),
  setSelectedDate: (dateStr: string) =>
    set({ selectedDate: dateStr, selectedDateContext: dateStr, viewedDate: dateStr }),
  setViewedDate: (dateStr: string) => set({ viewedDate: dateStr }),
  openAddSheet: (type = 'event', eventToEdit = null, dateContext = '') =>
    set({
      isAddSheetOpen: true,
      activeAddType: type,
      editingEvent: eventToEdit,
      selectedDateContext: dateContext,
    }),
  closeAddSheet: () => set({ isAddSheetOpen: false, editingEvent: null }),
  setActiveAddType: (type) => set({ activeAddType: type }),
}));
