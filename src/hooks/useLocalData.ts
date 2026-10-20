import { useCallback, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useCalendarSync } from './useCalendarDay';

/** Pass a stable module-level reader. No user data is synthesized on errors. */
export function useLocalData<T>(read: () => T) {
  const [data, setData] = useState<T | null>(() => {
    try {
      return read();
    } catch {
      return null;
    }
  });
  const [error, setError] = useState(false);
  const counter = useCalendarSync(state => state.refreshCounter);
  const lastCounter = useRef(counter);

  const refresh = useCallback(() => {
    try {
      setData(read());
      setError(false);
      lastCounter.current = useCalendarSync.getState().refreshCounter;
    } catch {
      setError(true);
    }
  }, [read]);

  useEffect(refresh, [refresh, counter]);

  useFocusEffect(
    useCallback(() => {
      if (lastCounter.current !== useCalendarSync.getState().refreshCounter) {
        refresh();
      }
      const listener = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      });
      return () => listener.remove();
    }, [refresh])
  );

  return { data, error, refresh };
}
