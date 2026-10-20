import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { colors, layout } from '@/constants/theme';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string = string>({
  options,
  selectedValue,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  useThemeRefresh();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === selectedValue));
  const [containerWidth, setContainerWidth] = useState(0);
  const animIndex = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    Animated.spring(animIndex, {
      toValue: selectedIndex,
      damping: 24,
      stiffness: 280,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [selectedIndex, animIndex]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const segmentWidth = containerWidth > 0 && options.length > 0 ? (containerWidth - 8) / options.length : 0;

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.background,
          borderWidth: 1,
          borderBottomWidth: 2,
          borderColor: colors.border,
          borderRadius: 9999,
          padding: 4,
          alignItems: 'center',
          position: 'relative',
        },
        style,
      ]}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 4,
            top: 4,
            bottom: 4,
            width: segmentWidth,
            borderRadius: 9999,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderBottomWidth: 2,
            borderColor: colors.border,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 1.5 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 2,
            transform: [
              {
                translateX: animIndex.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, segmentWidth],
                }),
              },
            ],
          }}
        />
      )}
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              minWidth: 0,
              zIndex: 1,
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={layout.maxFontScale}
              style={{
                fontSize: 12,
                fontWeight: isSelected ? '600' : '500',
                color: isSelected ? colors.text : colors['text-muted'],
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default SegmentedControl;
