import React from 'react';
import { View, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors } from '@/constants/theme';

/**
 * Standard circle size for date numbers across all calendar strips and views.
 * Width and height are strictly equal (36dp) with borderRadius exactly half (18dp).
 */
export const DAY_NUMBER_SIZE = 36;
export const DAY_NUMBER_RADIUS = 18; // Exactly DAY_NUMBER_SIZE / 2

export interface DayNumberProps {
  dayNum: number | string;
  isSelected?: boolean;
  isToday?: boolean;
  isWeekend?: boolean;
  isGhost?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Shared DayNumber component rendering a guaranteed circular date number badge.
 *
 * States (all using fixed 36dp x 36dp and 18dp radius):
 * - Ghost day: faint 40% opacity text, no background or border shape.
 * - Selected day: filled circle in primary color, on-primary text, medium weight (500).
 * - Today when not selected: outlined circle (1.5dp primary border, transparent fill), primary text, medium weight (500).
 * - Today and selected at the same time: filled circle in primary color (same as selected).
 * - Any other day: no shape at all (transparent fill, 0 border), normal text color (muted for weekend).
 */
export const DayNumber: React.FC<DayNumberProps> = ({
  dayNum,
  isSelected = false,
  isToday = false,
  isWeekend = false,
  isGhost = false,
  style,
  textStyle,
}) => {
  let backgroundColor: string = 'transparent';
  let borderWidth: number = 0;
  let borderColor: string = 'transparent';
  let textColor: string = isWeekend ? colors['text-muted'] : colors.text;
  let fontWeight: TextStyle['fontWeight'] = '400';

  if (isGhost) {
    // Ghost day from adjacent month: faint muted text, no circle shape
    backgroundColor = 'transparent';
    borderWidth = 0;
    borderColor = 'transparent';
    textColor = colors['text-muted'];
    fontWeight = '400';
  } else if (isSelected) {
    // Selected day & (Today + Selected): filled circle in primary color, on-primary text, medium weight
    backgroundColor = colors.primary;
    borderWidth = 0;
    borderColor = 'transparent';
    textColor = colors['on-primary'];
    fontWeight = '500';
  } else if (isToday) {
    // Today when not selected: outlined circle (1.5dp primary border, transparent fill), primary text
    backgroundColor = 'transparent';
    borderWidth = 1.5;
    borderColor = colors.primary;
    textColor = colors.primary;
    fontWeight = '500';
  } else {
    // Any other day: no shape at all, normal text color (muted for weekend)
    backgroundColor = 'transparent';
    borderWidth = 0;
    borderColor = 'transparent';
    textColor = isWeekend ? colors['text-muted'] : colors.text;
    fontWeight = '400';
  }

  return (
    <View
      style={[
        {
          width: DAY_NUMBER_SIZE,
          height: DAY_NUMBER_SIZE,
          borderRadius: DAY_NUMBER_RADIUS,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'center',
          backgroundColor,
          borderWidth,
          borderColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            fontSize: 14,
            fontWeight,
            color: textColor,
            opacity: isGhost ? 0.4 : 1,
            fontVariant: ['tabular-nums'],
            textAlign: 'center',
          },
          textStyle,
        ]}
      >
        {dayNum}
      </Text>
    </View>
  );
};

export default DayNumber;
