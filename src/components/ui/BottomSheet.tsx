import React, { useEffect, useRef } from 'react';
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
} from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

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
          toValue: windowHeight,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, translateY, windowHeight]);

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
    >
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
            justifyContent: 'flex-end',
            transform: [{ translateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        {/* The sheet container stays static (does NOT resize or move when keyboard opens) */}
        <View
          style={[
            {
              width: '100%',
              maxHeight: windowHeight * 0.90,
              backgroundColor: colors['surface-raised'],
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTopWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
              // flexDirection column so header/body/footer stack vertically
              flexDirection: 'column',
            },
            style,
          ]}
        >
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

          {/* Body slot — no wrapper; height budget is enforced by an explicit maxHeight
              on the ScrollView in the consumer (QuickAddBottomSheet). This avoids the
              flex:1-in-maxHeight-parent collapse-to-zero problem. */}
          {children}

          {/* Footer slot (optional) */}
          {footer ? (
            <View style={{ flexShrink: 0, width: '100%' }}>{footer}</View>
          ) : null}
        </View>
      </Animated.View>

      {/* Overlay slot (e.g. LiftedInputHost) inside Modal, full screen, on top of sheet */}
      {overlay}
    </Modal>
  );
}

export default BottomSheet;
