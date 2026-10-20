import { useThemeRefresh } from '@/hooks/useThemeRefresh';
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
  useThemeRefresh();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        speed: 60,
        bounciness: 0,
      }),
      Animated.spring(rotateAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 6,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 40,
        bounciness: 5,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 35,
        bounciness: 4,
      }),
    ]).start();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

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
            borderWidth: 1,
            borderColor: colors.primary,
            borderBottomWidth: 3.5,
            borderBottomColor: colors.text,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.32,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
        className="items-center justify-center"
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Plus size={24} color={colors['on-primary']} strokeWidth={2.2} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default FloatingAddButton;
