import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Animated,
  StyleProp,
  ViewStyle,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hideDragHandle?: boolean;
  overlay?: React.ReactNode;
  heightRatio?: number;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  title,
  header,
  footer,
  style,
  hideDragHandle = false,
  overlay,
  heightRatio = 0.90,
}: BottomSheetProps) {
  useThemeRefresh();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const windowHeightRef = useRef(windowHeight);
  windowHeightRef.current = windowHeight;
  // Measure the native modal itself: its bounds can differ from the app window.
  const [viewport, setViewport] = useState({
    visible, windowWidth, height: windowHeight, insets, measured: false,
  });
  if (viewport.visible !== visible || viewport.windowWidth !== windowWidth) {
    setViewport({ visible, windowWidth, height: windowHeight, insets, measured: false });
  }
  const handleViewportLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (!visible || layout.height <= 0) return;
    setViewport(previous => {
      // Once measured, ignore the shorter IME viewport, including keyboard changes.
      if (previous.measured && layout.height <= previous.height) return previous;
      return { ...previous, height: layout.height, measured: true };
    });
  };
  const sheetHeight = Math.min(
    viewport.height * heightRatio,
    viewport.height - viewport.insets.top - spacing.sm,
  );
  const sheetTop = viewport.height - sheetHeight;

  // Entrance/exit slide animation (native driver)
  const translateY = useRef(new Animated.Value(windowHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle modal visibility animation
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 250,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: windowHeightRef.current,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, translateY]);

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={{ flex: 1 }} onLayout={handleViewportLayout}>
        {/* Dimmed Overlay Backdrop */}
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: colors.overlay,
                opacity: fadeAnim,
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Outer sliding container: entrance/exit slide with native driver */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Extend the opaque sheet surface to the actual modal bottom. */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: sheetTop, bottom: 0, left: 0, right: 0,
            backgroundColor: colors['surface-raised'],
            borderTopLeftRadius: 12, borderTopRightRadius: 12,
          }} />
          {/* The sheet container stays static (does NOT resize or move when keyboard opens) */}
          <View
            style={[
              {
                width: '100%',
                position: 'absolute',
                top: sheetTop,
                height: sheetHeight,
                backgroundColor: colors['surface-raised'],
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                borderTopWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
                // flexDirection column so header/body/footer stack vertically
                flexDirection: 'column',
              },
              style,
            ]}
          >
            <SafeAreaInsetsContext.Provider value={viewport.insets}>
              {/* Header slot: guaranteed never to shrink */}
              {header ? (
                <View style={{ flexShrink: 0, width: '100%' }}>{header}</View>
              ) : (
                <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexShrink: 0, width: '100%' }}>
                  {!hideDragHandle && (
                    <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
                      <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 9999 }} />
                    </View>
                  )}
                  {title && <View style={{ marginBottom: spacing.base }}>{title}</View>}
                </View>
              )}

              {/* The body takes the measured space left after the header and footer. */}
              <View style={{ flex: 1, minHeight: 0, width: '100%' }}>{children}</View>

              {/* Footer slot (optional) */}
              {footer ? (
                <View style={{ flexShrink: 0, width: '100%' }}>{footer}</View>
              ) : null}
            </SafeAreaInsetsContext.Provider>
          </View>
        </Animated.View>

        {/* Overlay slot (e.g. LiftedInputHost) inside Modal, full screen, on top of sheet */}
        {overlay}
      </View>
    </Modal>
  );
}

export default BottomSheet;
