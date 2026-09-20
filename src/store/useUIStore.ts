import { create } from 'zustand';

export type QuickAddType = 'event' | 'task' | 'transaction' | 'note';

interface UIState {
  isAddSheetOpen: boolean;
  activeAddType: QuickAddType;
  openAddSheet: (type?: QuickAddType) => void;
  closeAddSheet: () => void;
  setActiveAddType: (type: QuickAddType) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAddSheetOpen: false,
  activeAddType: 'event',
  openAddSheet: (type = 'event') => set({ isAddSheetOpen: true, activeAddType: type }),
  closeAddSheet: () => set({ isAddSheetOpen: false }),
  setActiveAddType: (type) => set({ activeAddType: type }),
}));
