import { useRef, useCallback, useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useKeyboardInsets } from './useKeyboardInsets';

export function useScrollToField(scrollViewRef: React.RefObject<ScrollView | null>) {
  const scrollViewHeightRef = useRef<number>(0);
  const focusedFieldRef = useRef<React.RefObject<any> | null>(null);
  const { showCompletedCount, isKeyboardVisible } = useKeyboardInsets();

  const handleScrollViewLayout = useCallback((height: number) => {
    scrollViewHeightRef.current = height;
  }, []);

  const scrollToField = useCallback(
    (fieldRef: React.RefObject<any> | null, extraSpacing = 24) => {
      if (!fieldRef?.current || !scrollViewRef.current) return;

      const performScroll = () => {
        const scrollNode = scrollViewRef.current;
        const targetNode = fieldRef.current;
        if (!scrollNode || !targetNode) return;

        try {
          targetNode.measureLayout(
            scrollNode,
            (_x: number, y: number, _w: number, height: number) => {
              const viewHeight = scrollViewHeightRef.current;
              if (viewHeight <= 0) return;

              // Position field so there is about 24dp of space between its bottom and the viewport bottom
              const targetY = Math.max(0, Math.round(y + height + extraSpacing - viewHeight));
              scrollNode.scrollTo({ y: targetY, animated: true });
            },
            () => {
              // Fallback if measureLayout fails
            }
          );
        } catch {
          // Ignore layout measurement race conditions
        }
      };

      // Measure immediately
      performScroll();

      // And again after a frame to catch layout shifts
      requestAnimationFrame(performScroll);
    },
    [scrollViewRef]
  );

  const handleFieldFocus = useCallback(
    (fieldRef: React.RefObject<any>) => {
      focusedFieldRef.current = fieldRef;
      scrollToField(fieldRef, 24);
    },
    [scrollToField]
  );

  const handleFieldBlur = useCallback(
    (fieldRef: React.RefObject<any>) => {
      if (focusedFieldRef.current === fieldRef) {
        focusedFieldRef.current = null;
      }
    },
    []
  );

  const handleContentSizeChange = useCallback(
    (fieldRef: React.RefObject<any>) => {
      if (focusedFieldRef.current === fieldRef) {
        scrollToField(fieldRef, 24);
      }
    },
    [scrollToField]
  );

  // When keyboard finishes opening (showCompletedCount increases), re-measure and scroll
  useEffect(() => {
    if (showCompletedCount > 0 && isKeyboardVisible && focusedFieldRef.current) {
      scrollToField(focusedFieldRef.current, 24);
    }
  }, [showCompletedCount, isKeyboardVisible, scrollToField]);

  return {
    handleScrollViewLayout,
    handleFieldFocus,
    handleFieldBlur,
    handleContentSizeChange,
    scrollToField,
  };
}

export default useScrollToField;
