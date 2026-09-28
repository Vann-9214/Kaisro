import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getDb } from '@/db';
import { tasks, subtasks, type Task, type Subtask } from '@/db/schema';
import { useCalendarSync } from './useCalendarDay';

/** Read-only snapshot; refresh on tab focus, app resume, writes elsewhere, and midnight. */
export function useTasksList() {
  const [data, setData] = useState<{ tasks: Task[]; subtasks: Subtask[] }>({ tasks: [], subtasks: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const refreshCounter = useCalendarSync(s => s.refreshCounter);
  const refresh = useCallback(() => {
    try {
      const db = getDb();
      setData({ tasks: db.select().from(tasks).all(), subtasks: db.select().from(subtasks).all() });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh, refreshCounter]);
  useFocusEffect(useCallback(() => {
    refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 60000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refresh]));
  return { ...data, isLoading, error, refresh };
}
