export interface Insets {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}

export interface LiftedBarPositionInputs {
  initialWindowHeight: number;
  currentWindowHeight: number;
  keyboardScreenY: number;
  keyboardHeight?: number;
  bottomInset: number;
}

export interface LiftedBarPositionOutput {
  bottomOffset: number;
  isKeyboardVisible: boolean;
  systemDidResize: boolean;
}

/**
 * Pure function to calculate the bottom offset for the lifted input bar.
 * 
 * Determines whether the window itself was resized by Android/iOS
 * and positions the bar flush on top of the keyboard with no gap, no overlap,
 * and accounts for navigation bar insets and tall keyboards.
 */
export function calculateLiftedBarPosition({
  initialWindowHeight,
  currentWindowHeight,
  keyboardScreenY,
  keyboardHeight = 0,
  bottomInset,
}: LiftedBarPositionInputs): LiftedBarPositionOutput {
  const isKeyboardVisible =
    keyboardHeight > 0 || (keyboardScreenY > 0 && keyboardScreenY < initialWindowHeight);

  if (!isKeyboardVisible) {
    return {
      bottomOffset: 0,
      isKeyboardVisible: false,
      systemDidResize: false,
    };
  }

  // Detect if the system window resized (e.g. adjustResize shrank window by > 80dp)
  const systemDidResize = initialWindowHeight - currentWindowHeight > 80;

  if (systemDidResize) {
    // Window itself was shrunk to fit above keyboard; bar docks to bottom of current window
    const remainingOverlap = Math.max(0, currentWindowHeight - keyboardScreenY);
    return {
      bottomOffset: Math.round(remainingOverlap),
      isKeyboardVisible: true,
      systemDidResize: true,
    };
  }

  // Edge-to-edge: add +72dp clearance so the entire card and textbox
  // float comfortably above the keyboard with clear visible margin
  const KEYBOARD_CLEARANCE = 72;
  const effectiveKeyboardHeight = Math.max(
    keyboardHeight + KEYBOARD_CLEARANCE,
    initialWindowHeight - keyboardScreenY + KEYBOARD_CLEARANCE
  );

  return {
    bottomOffset: Math.max(0, Math.round(effectiveKeyboardHeight)),
    isKeyboardVisible: true,
    systemDidResize: false,
  };
}

export interface FieldNavigationResult {
  nextFieldId: string | null;
  isLastField: boolean;
  action: 'next' | 'done';
}

/**
 * Pure function to determine Next / Done action and the next field in sequence.
 */
export function getFieldNavigation(
  fieldOrder: string[],
  currentFieldId: string
): FieldNavigationResult {
  const currentIndex = fieldOrder.indexOf(currentFieldId);
  if (currentIndex === -1) {
    return { nextFieldId: null, isLastField: true, action: 'done' };
  }
  const isLastField = currentIndex === fieldOrder.length - 1;
  const nextFieldId = isLastField ? null : fieldOrder[currentIndex + 1];
  return {
    nextFieldId,
    isLastField,
    action: isLastField ? 'done' : 'next',
  };
}
