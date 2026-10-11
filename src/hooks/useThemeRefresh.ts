import { usePreferencesStore } from '@/store/usePreferencesStore';

/** Subscribe inline native styles to the same palette used by NativeWind. */
export function useThemeRefresh() {
  usePreferencesStore(state => state.version);
}
