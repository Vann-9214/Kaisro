# Design Spec: Smooth, Lag-Free Lifted Text Box Transitions

**Date:** 2026-10-03  
**Status:** Approved  
**Topic:** Smooth native transitions for lifted input cards and backdrop scrim

---

## 1. Overview & Context

When tapping a text input field in Kaisro, the field triggers `LiftedInputHost` to open a lifted typing card above the keyboard. Currently, several issues cause visual jerkiness and abruptness:
1. **Backdrop Scrim:** Instantly pops to 100% opacity without a fade transition.
2. **Card Snapping:** The card renders at the bottom of the screen before the keyboard opens, and abruptly snaps up once the keyboard layout updates.
3. **Instant Disappearance:** When dismissing (via scrim tap or "Done"), the card unmounts immediately (0 ms) with no exit transition while the keyboard is still animating away.
4. **Field Switching Blink:** Tapping "Next" resets the card's entrance animation, causing the entire card to flash/blink to 0 opacity.

The goal is to provide a 60/120 fps hardware-accelerated, silky smooth transition pipeline for opening, navigating, and closing lifted inputs with zero lag.

---

## 2. Technical Architecture & Design

### 2.1 Native-Driver Transitions in `LiftedInputHost`
All animations use `useNativeDriver: true` to run on the native render thread, completely avoiding JavaScript thread blocking or layout thrashing.

1. **Backdrop Scrim (`scrimOpacity`):**
   - Animate from `0` to `1` over 180 ms on entrance.
   - Animate from `1` to `0` over 140 ms on exit.

2. **Card Entrance (`cardOpacity` & `cardTranslateY`):**
   - Soft glide and fade: `cardOpacity` 0 -> 1 (180 ms), `cardTranslateY` 20 -> 0 (spring with tension 70, friction 9).
   - Card vertical positioning smoothly tracks keyboard offset using native `translateY` or smooth timing transition matching keyboard duration.

3. **Graceful Exit Lifecycle (`isClosing`):**
   - When dismissal is requested (`closeBar`):
     1. Set `isClosing = true`.
     2. Dismiss the keyboard (`Keyboard.dismiss()`).
     3. Animate `scrimOpacity` to 0 and `cardOpacity` to 0 with slight slide down (140 ms).
     4. On completion callback, clear `activeField` in context (`setActiveField(null)`).

4. **Flicker-Free Field Chaining ("Next"):**
   - Distinguish between "first opening" and "switching active fields".
   - When switching fields via "Next", keep the card structure mounted and stable; do not reset card opacity to 0.

5. **Accessibility (`isReduceMotion`):**
   - When `isReduceMotion` is enabled, transition durations set to 0.

---

## 3. Verification Plan
- Run `npm run check-types` (`npx tsc --noEmit`).
- Run `npm run check:ui`.
- Verify smooth animation properties in `LiftedInputHost.tsx` and `LiftedInputContext.tsx`.
