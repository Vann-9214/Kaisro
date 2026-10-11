import { create } from 'zustand';
import { Appearance } from 'react-native';
import { getDb } from '@/db';
import { DEFAULT_PREFERENCES, readPreferences, savePreferences, type PlannerPreferences } from '@/db/preferencesActions';
import { applyTheme } from '@/constants/theme';

interface PreferencesState {
  preferences: PlannerPreferences;
  dark: boolean;
  version: number;
  hydrate: () => void;
  update: (patch: Partial<PlannerPreferences>) => void;
  refreshSystemTheme: () => void;
}
function darkFor(preferences: PlannerPreferences) {
  return preferences.theme === 'dark' || (preferences.theme === 'system' && Appearance.getColorScheme() === 'dark');
}
export const usePreferencesStore = create<PreferencesState>((set, get) => {
  const activate = (preferences: PlannerPreferences) => {
    const dark = darkFor(preferences); applyTheme(dark);
    set(state => ({ preferences, dark, version: state.version + 1 }));
  };
  return { preferences: { ...DEFAULT_PREFERENCES }, dark: false, version: 0,
    hydrate: () => activate(readPreferences(getDb())),
    update: patch => activate(savePreferences(getDb(), patch)),
    refreshSystemTheme: () => activate(get().preferences),
  };
});
