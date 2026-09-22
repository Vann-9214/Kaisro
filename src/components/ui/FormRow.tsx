import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { colors, layout } from '@/constants/theme';

export interface FormRowProps {
  /** Leading icon on the left (12dp gap to label) */
  icon?: React.ReactNode;
  /** Primary label text or component */
  label: React.ReactNode;
  /** Secondary value line displayed below label (4dp gap) */
  value?: React.ReactNode;
  /** Hint text displayed below label (4dp gap) */
  hint?: React.ReactNode;
  /** Error text displayed below label (4dp gap) */
  error?: React.ReactNode;
  /** Trailing action element on the right (e.g. toggle or chevron), vertically centered */
  right?: React.ReactNode;
  /** Custom inner content if replacing standard label/value layout */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FormRow({
  icon,
  label,
  value,
  hint,
  error,
  right,
  children,
  style,
}: FormRowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      {/* Left side: Icon + Middle Content */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
        }}
      >
        {icon && (
          <View
            style={{
              marginRight: layout.iconToLabelGap, // 12dp gap
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
        )}

        <View style={{ flex: 1, justifyContent: 'center' }}>
          {children ? (
            children
          ) : (
            <>
              {typeof label === 'string' ? (
                <Text
                  maxFontSizeMultiplier={layout.maxFontScale}
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: colors.text,
                  }}
                >
                  {label}
                </Text>
              ) : (
                label
              )}

              {Boolean(value) && (
                <View style={{ marginTop: layout.labelToValueGap }}>
                  {typeof value === 'string' ? (
                    <Text
                      maxFontSizeMultiplier={layout.maxFontScale}
                      style={{
                        fontSize: 12,
                        color: colors['text-muted'],
                      }}
                    >
                      {value}
                    </Text>
                  ) : (
                    value
                  )}
                </View>
              )}

              {Boolean(hint) && !error && (
                <View style={{ marginTop: layout.labelToValueGap }}>
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={{
                      fontSize: 11,
                      color: colors['text-muted'],
                    }}
                  >
                    {hint}
                  </Text>
                </View>
              )}

              {Boolean(error) && (
                <View style={{ marginTop: layout.labelToValueGap }}>
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={{
                      fontSize: 12,
                      color: colors.error,
                    }}
                  >
                    {error}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {/* Right side: Chevron, toggle, or action aligned to the right and vertically centered */}
      {right && (
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: layout.iconToLabelGap,
          }}
        >
          {right}
        </View>
      )}
    </View>
  );
}

export default FormRow;
