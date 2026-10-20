import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React from 'react';
import { View } from 'react-native';
import { Home, ShoppingCart, Utensils, Zap, Car, Coffee, Heart, MoreHorizontal, Briefcase, Tag } from 'lucide-react-native';
import { colors } from '@/constants/theme';

const icons = { home: Home, 'shopping-cart': ShoppingCart, utensils: Utensils, zap: Zap, car: Car, coffee: Coffee, heart: Heart, 'more-horizontal': MoreHorizontal, briefcase: Briefcase, tag: Tag };
export const categoryIcons = Object.keys(icons);

export function CategoryIcon({
  name,
  size = 18,
  container = true,
}: {
  name: string;
  size?: number;
  container?: boolean;
}) {
  useThemeRefresh();
  const Icon = icons[name as keyof typeof icons] ?? Tag;

  if (!container) {
    return <Icon size={size} color={colors['on-money']} strokeWidth={1.5} />;
  }

  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors['surface-raised'],
        borderWidth: 1,
        borderColor: colors.border,
        borderBottomWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1.5,
      }}
    >
      <Icon size={size} color={colors['on-money']} strokeWidth={1.8} />
    </View>
  );
}
