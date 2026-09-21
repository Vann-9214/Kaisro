import { useEffect } from 'react';
import { create } from 'zustand';
import {
  START_HOUR,
  HOUR_HEIGHT,
  formatTimeDisplay,
  computeNowTop,
} from '@/utils/timelineLayout';

interface NowState {
  hours: number;
  minutes: number;
  nowMinutes: number;
  nowLineTop: number;
  nowFormattedTime: string;
  updateNow: () => void;
}

function calculateCurrentState() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const top = computeNowTop(h, m, START_HOUR, HOUR_HEIGHT);
  const totalMinutes = (h - START_HOUR) * 60 + m;
  return {
    hours: h,
    minutes: m,
    nowMinutes: totalMinutes,
    nowLineTop: top,
    nowFormattedTime: formatTimeDisplay(h, m),
  };
}

export const useNowStore = create<NowState>((set) => ({
  ...calculateCurrentState(),
  updateNow: () => {
    set(calculateCurrentState());
  },
}));

/**
 * Hook to manage a single minute timer that updates useNowStore.
 * Aligns updates precisely to the system clock minute boundary.
 * Does NOT cause the calling component to re-render unless it selects state.
 */
export function useNowTimer(isToday: boolean) {
  const updateNow = useNowStore((s) => s.updateNow);

  useEffect(() => {
    if (!isToday) return;

    // Immediately synchronize to the latest time
    updateNow();

    // Compute delay until the exact start of the next minute
    const delay = (60 - new Date().getSeconds()) * 1000;
    let interval: ReturnType<typeof setInterval> | null = null;

    const timeout = setTimeout(() => {
      updateNow();
      interval = setInterval(updateNow, 60000);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [isToday, updateNow]);
}
