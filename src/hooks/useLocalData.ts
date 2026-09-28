import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCalendarSync } from './useCalendarDay';

/** Pass a stable module-level reader. No user data is synthesized on errors. */
export function useLocalData<T>(read: () => T) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const counter = useCalendarSync(state => state.refreshCounter);
  const refresh = useCallback(() => {
    try { setData(read()); setError(false); } catch { setError(true); }
  }, [read]);
  useEffect(refresh, [refresh, counter]);
  useFocusEffect(useCallback(() => {
    refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [refresh]));
  return { data, error, refresh };
}
