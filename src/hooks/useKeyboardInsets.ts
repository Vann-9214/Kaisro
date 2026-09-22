import { useState, useEffect, useRef } from 'react';
import { Keyboard, KeyboardEvent, Platform, useWindowDimensions } from 'react-native';

export interface KeyboardInsetsState {
  /** Screen Y coordinate of keyboard top edge. Equals windowHeight when hidden. */
  keyboardScreenY: number;
  /** Overlap with window (initialWindowHeight - keyboardScreenY) */
  keyboardHeight: number;
  /** Animation duration in milliseconds */
  duration: number;
  /** Whether keyboard is currently visible */
  isKeyboardVisible: boolean;
  /** Initial window height before keyboard opened */
  initialWindowHeight: number;
  /** Current window height (which may shrink if system resized window) */
  currentWindowHeight: number;
  /** Count of keyboard show completions */
  showCompletedCount: number;
}

/**
 * Shared hook to track keyboard top edge screen coordinate, animation duration,
 * and detect whether the window was resized by the OS.
 */
export function useKeyboardInsets(): KeyboardInsetsState {
  const { height: windowHeight } = useWindowDimensions();
  const initialWindowHeightRef = useRef(windowHeight);
  const currentWindowHeightRef = useRef(windowHeight);
  const showCountRef = useRef(0);
  currentWindowHeightRef.current = windowHeight;

  const [state, setState] = useState<KeyboardInsetsState>(() => ({
    keyboardScreenY: windowHeight,
    keyboardHeight: 0,
    duration: 0,
    isKeyboardVisible: false,
    initialWindowHeight: windowHeight,
    currentWindowHeight: windowHeight,
    showCompletedCount: 0,
  }));

  useEffect(() => {
    // When keyboard is not visible, keep initialWindowHeight updated with actual window height
    if (!state.isKeyboardVisible) {
      initialWindowHeightRef.current = windowHeight;
    }
  }, [windowHeight, state.isKeyboardVisible]);

  useEffect(() => {
    const handleKeyboardShow = (e: KeyboardEvent) => {
      showCountRef.current += 1;
      const initialHeight = initialWindowHeightRef.current;
      const currentHeight = currentWindowHeightRef.current;
      const endHeight = e.endCoordinates?.height ?? 0;
      const screenY = e.endCoordinates?.screenY ?? currentHeight;
      const overlap = Math.max(
        endHeight,
        currentHeight - screenY,
        initialHeight - screenY
      );
      const duration = e.duration && e.duration > 0
        ? e.duration
        : (Platform.OS === 'ios' ? 250 : 200);

      setState({
        keyboardScreenY: screenY,
        keyboardHeight: overlap,
        duration,
        isKeyboardVisible: true,
        initialWindowHeight: initialHeight,
        currentWindowHeight: currentHeight,
        showCompletedCount: showCountRef.current,
      });
    };

    const handleKeyboardHide = (e?: KeyboardEvent) => {
      const currentHeight = currentWindowHeightRef.current;
      initialWindowHeightRef.current = currentHeight;
      const duration = e?.duration && e.duration > 0
        ? e.duration
        : (Platform.OS === 'ios' ? 250 : 200);

      setState({
        keyboardScreenY: currentHeight,
        keyboardHeight: 0,
        duration,
        isKeyboardVisible: false,
        initialWindowHeight: currentHeight,
        currentWindowHeight: currentHeight,
        showCompletedCount: showCountRef.current,
      });
    };

    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', handleKeyboardShow),
      Keyboard.addListener('keyboardDidHide', handleKeyboardHide),
    ];

    if (Platform.OS === 'ios') {
      subscriptions.push(
        Keyboard.addListener('keyboardWillShow', handleKeyboardShow),
        Keyboard.addListener('keyboardWillHide', handleKeyboardHide)
      );
    } else {
      try {
        subscriptions.push(
          Keyboard.addListener('keyboardWillShow', handleKeyboardShow),
          Keyboard.addListener('keyboardWillHide', handleKeyboardHide)
        );
      } catch {}
    }

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  return state;
}

export default useKeyboardInsets;
