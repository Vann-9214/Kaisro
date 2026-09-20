import React from 'react';
import { Pressable, Animated, StyleProp, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export interface FloatingAddButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  size?: number;
}

export function FloatingAddButton({
  onPress,
  style,
  size = 52,
}: FloatingAddButtonProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel="Add entry"
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
            elevation: 6,
          },
        ]}
        className="items-center justify-center"
      >
        <Plus size={24} color={colors['on-primary']} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

export default FloatingAddButton;
