import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { CURRENCY, formatCurrency } from '@/constants/currency';
import { useUIStore } from '@/store/useUIStore';

export default function BudgetScreen() {
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();

  // Sample figures in integer centavos
  const totalSpentCentavos = 4858150; // ₱48,581.50
  const monthlyCapCentavos = 7000000; // ₱70,000.00
  const spendRatio = totalSpentCentavos / monthlyCapCentavos;

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            September 2026 Ledger
          </Text>
          <Text className="text-2xl font-medium text-text">Budget & Spending</Text>
        </View>

        {/* Budget Overview Card */}
        <Card module="money" className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Monthly Outflow ({CURRENCY.code})
            </Text>
            <Chip label="Warm Sand" variant="money" size="sm" />
          </View>
          <Text className="text-2xl font-medium text-text mb-1">
            {formatCurrency(totalSpentCentavos)}
          </Text>
          <Text className="text-xs text-text-muted mb-3">
            Cap: {formatCurrency(monthlyCapCentavos)} ({Math.round(spendRatio * 100)}% utilized)
          </Text>
          <ProgressBar progress={spendRatio} module="money" />
        </Card>

        {/* Category breakdown sample */}
        <Card className="mb-4">
          <Text className="text-sm font-medium text-text mb-3">Category Caps</Text>
          <View className="space-y-3">
            <View className="flex-row items-center justify-between py-1 border-b border-border">
              <Text className="text-xs text-text">Housing & Rent</Text>
              <Text className="text-xs font-medium text-text">{formatCurrency(2200000)}</Text>
            </View>
            <View className="flex-row items-center justify-between py-1 border-b border-border">
              <Text className="text-xs text-text">Utilities & Bills</Text>
              <Text className="text-xs font-medium text-text">{formatCurrency(636800)}</Text>
            </View>
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-text">Food & Dining</Text>
              <Text className="text-xs font-medium text-text">{formatCurrency(604250)}</Text>
            </View>
          </View>
        </Card>

        <Button
          title={`+ Add Expense (${CURRENCY.symbol})`}
          variant="money"
          size="sm"
          onPress={() => openAddSheet('transaction')}
        />
      </ScrollView>
    </View>
  );
}
