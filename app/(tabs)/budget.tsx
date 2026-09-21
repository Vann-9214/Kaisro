import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { CURRENCY, formatCurrency } from '@/constants/currency';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { colors } from '@/constants/theme';

export default function BudgetScreen() {
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();
  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const [categoriesList, setCategoriesList] = useState<schema.Category[]>([]);
  const [transactionsList, setTransactionsList] = useState<schema.Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const headerMonthYear = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const fetchBudgetData = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = getDb();
      const [cats, txs] = await Promise.all([
        db.select().from(schema.categories),
        db.select().from(schema.transactions),
      ]);
      setCategoriesList(cats);
      setTransactionsList(txs);
    } catch (e) {
      console.error('[BudgetScreen Error]', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData, refreshCounter]);

  // Current month's total outflow in integer centavos
  const totalSpentCentavos = useMemo(() => {
    return transactionsList
      .filter(
        (tx) =>
          tx.type === 'expense' &&
          tx.date &&
          tx.date.startsWith(currentMonthStr)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactionsList, currentMonthStr]);

  // Aggregate monthly cap from all categories that have a non-null cap
  const totalCapCentavos = useMemo(() => {
    const cappedCategories = categoriesList.filter(
      (c) => c.monthlyCap !== null && c.monthlyCap !== undefined && c.monthlyCap > 0
    );
    if (cappedCategories.length === 0) return null;
    return cappedCategories.reduce((sum, c) => sum + (c.monthlyCap ?? 0), 0);
  }, [categoriesList]);

  const spendRatio =
    totalCapCentavos !== null && totalCapCentavos > 0
      ? Math.min(1, totalSpentCentavos / totalCapCentavos)
      : 0;

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
            {headerMonthYear} Ledger
          </Text>
          <Text className="text-2xl font-medium text-text">Budget & Spending</Text>
        </View>

        {/* Budget Overview Card */}
        <Card module="money" className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Monthly Outflow ({CURRENCY.code})
            </Text>
            <Chip
              label={totalCapCentavos !== null ? `${Math.round(spendRatio * 100)}%` : 'No Cap'}
              variant="money"
              size="sm"
            />
          </View>
          <Text className="text-2xl font-medium text-text mb-1 tabular-nums">
            {formatCurrency(totalSpentCentavos)}
          </Text>
          <Text className="text-xs text-text-muted mb-3 tabular-nums">
            {totalCapCentavos !== null
              ? `Cap: ${formatCurrency(totalCapCentavos)} (${Math.round(spendRatio * 100)}% utilized)`
              : 'No monthly cap configured'}
          </Text>
          {totalCapCentavos !== null && (
            <ProgressBar progress={spendRatio} module="money" />
          )}
        </Card>

        {/* Category Breakdown Card */}
        <Card className="mb-4">
          <Text className="text-sm font-medium text-text mb-3">Categories & Caps</Text>
          {isLoading ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color={colors.money} />
            </View>
          ) : categoriesList.length === 0 ? (
            <Text className="text-xs text-text-muted italic py-1">
              No categories found.
            </Text>
          ) : (
            <View className="space-y-2">
              {categoriesList.map((cat, idx) => (
                <View
                  key={cat.id}
                  className={`flex-row items-center justify-between py-1.5 ${
                    idx < categoriesList.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <Text className="text-xs text-text font-medium">{cat.name}</Text>
                  <Text className="text-xs font-medium text-text-muted tabular-nums">
                    {cat.monthlyCap !== null && cat.monthlyCap !== undefined && cat.monthlyCap > 0
                      ? formatCurrency(cat.monthlyCap)
                      : '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
