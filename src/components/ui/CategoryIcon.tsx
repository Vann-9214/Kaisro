import React from 'react';
import { Home, ShoppingCart, Utensils, Zap, Car, Coffee, Heart, MoreHorizontal, Briefcase, Tag } from 'lucide-react-native';
import { colors } from '@/constants/theme';
const icons = { home: Home, 'shopping-cart': ShoppingCart, utensils: Utensils, zap: Zap, car: Car, coffee: Coffee, heart: Heart, 'more-horizontal': MoreHorizontal, briefcase: Briefcase, tag: Tag };
export const categoryIcons = Object.keys(icons);
export function CategoryIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] ?? Tag;
  return <Icon size={size} color={colors['on-money']} strokeWidth={1.5} />;
}
