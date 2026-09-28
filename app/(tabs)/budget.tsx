import React from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react-native';
import { TopBar, FormCard, FormRow, SheetSection, EmptyState, ProgressBar } from '@/components/ui';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { colors, spacing } from '@/constants/theme';
import { formatCurrency } from '@/constants/currency';
import { useUIStore } from '@/store/useUIStore';
import { useLocalData } from '@/hooks/useLocalData';
import { getDb, categories, transactions, recurringTransactions } from '@/db';
import { buildBudget, shiftMonth } from '@/utils/budgetUtils';
import { parseISODate } from '@/utils/dateUtils';

function readBudget() {
  const db = getDb();
  return { categories: db.select().from(categories).all(), transactions: db.select().from(transactions).all(), rules: db.select().from(recurringTransactions).all() };
}
export default function BudgetScreen() {
  const { budgetMonth, setBudgetMonth, openAddSheet } = useUIStore();
  const { data, error, refresh } = useLocalData(readBudget);
  const insets = useSafeAreaInsets();
  const budget = data ? buildBudget(budgetMonth, data.categories, data.transactions, data.rules) : null;
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <TopBar featureName="Budget" />
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 52 + spacing.lg + spacing.base + insets.bottom }}>
      <SheetSection gap="lg">
        <FormRow label={<Text style={{ color: colors.text, fontSize: 24, fontFamily: 'Inter_500Medium' }}>{parseISODate(budgetMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>}
          right={<View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={spacing.sm} onPress={() => setBudgetMonth(shiftMonth(budgetMonth, -1))}><ChevronLeft color={colors.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={spacing.sm} onPress={() => setBudgetMonth(shiftMonth(budgetMonth, 1))}><ChevronRight color={colors.text} size={22} /></Pressable>
          </View>} />
        {error ? <EmptyState variant="full" title="Couldn't load budget" actionLabel="Try again" onAction={refresh} description="Please try reading your ledger again." />
          : !budget ? <ActivityIndicator color={colors.money} /> : <>
          <FormCard style={{ backgroundColor: colors.surface }}><SheetSection gap="sm">
            <Text style={{ color: colors['text-muted'] }}>MONTHLY SUMMARY</Text>
            <FormRow label="Income" right={<Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>{formatCurrency(budget.income)}</Text>} />
            <FormRow label="Expenses" right={<Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>{formatCurrency(budget.expenses)}</Text>} />
            <FormRow label="Remaining" right={<Text style={{ color: colors['on-money'], fontSize: 24, fontVariant: ['tabular-nums'] }}>{formatCurrency(budget.remaining)}</Text>} />
          </SheetSection></FormCard>
          {budget.entries.length === 0 && <FormCard style={{ backgroundColor: colors.surface }}>
            <EmptyState variant="full" title="No spending logged yet" description="Track quiet daily purchases or archival notes with mindful precision." actionLabel="Log an expense" actionModule="money"
              icon={<Receipt size={22} color={colors['on-money']} />} onAction={() => openAddSheet('transaction')} />
          </FormCard>}
          {budget.recurring.length > 0 && <SheetSection>
            <Text style={{ color: colors.text, fontSize: 16 }}>Recurring obligations</Text>
            {budget.recurring.map(rule => <FormCard key={rule.id}><FormRow label={rule.note || data?.categories.find(category => category.id === rule.categoryId)?.name || 'Monthly entry'}
              value={parseISODate(rule.dueDate).toLocaleDateString()} right={<Text style={{ color: colors['on-money'] }}>{formatCurrency(rule.amount)}</Text>} /></FormCard>)}
          </SheetSection>}
          <SheetSection>
            <Text style={{ color: colors.text, fontSize: 16 }}>Categories</Text>
            {budget.categoryRows.map(category => <FormCard key={category.id} style={{ backgroundColor: colors.surface }}><SheetSection gap="sm">
              <FormRow icon={<CategoryIcon name={category.icon} />} label={category.name}
                right={<Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>{formatCurrency(category.spent)}</Text>} />
              {category.monthlyCap !== null && category.monthlyCap > 0 && <>
                <ProgressBar module="money" progress={Math.min(1, category.spent / category.monthlyCap)} />
                <Text style={{ color: colors['text-muted'], fontSize: 12 }}>{formatCurrency(category.monthlyCap)} cap</Text>
              </>}
            </SheetSection></FormCard>)}
          </SheetSection>
          {budget.groups.length > 0 && <SheetSection>
            <Text style={{ color: colors.text, fontSize: 16 }}>Recent transactions</Text>
            {budget.groups.map(group => <SheetSection key={group.day} gap="sm">
              <Text style={{ color: colors['text-muted'], fontSize: 12 }}>{parseISODate(group.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
              {group.entries.map(entry => <FormCard key={entry.id} style={{ backgroundColor: colors.surface }} onPress={() => openAddSheet('transaction', entry)}>
                <FormRow label={entry.note || data?.categories.find(category => category.id === entry.categoryId)?.name || 'Other'}
                  value={entry.type === 'income' ? 'Income' : entry.type === 'transfer' ? 'Transfer' : 'Expense'}
                  right={<Text style={{ color: entry.type === 'income' ? colors.tasks : colors.text, fontVariant: ['tabular-nums'] }}>{entry.type === 'income' ? '+' : entry.type === 'expense' ? '−' : ''}{formatCurrency(entry.amount)}</Text>} />
              </FormCard>)}
            </SheetSection>)}
          </SheetSection>}
        </>}
      </SheetSection>
    </ScrollView>
  </View>;
}
