import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { TopBar, FormCard, FormRow, SheetSection, EmptyState, ProgressBar, Button } from '@/components/ui';
import { EditorSheet } from '@/components/ui/EditorSheet';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { colors, spacing, layout } from '@/constants/theme';
import { formatCurrency, parseToCentavos } from '@/constants/currency';
import { useUIStore } from '@/store/useUIStore';
import { useLocalData } from '@/hooks/useLocalData';
import { getDb, categories, transactions, recurringTransactions, type RecurringTransaction } from '@/db';
import { buildBudget, shiftMonth, budgetAlert } from '@/utils/budgetUtils';
import { parseISODate } from '@/utils/dateUtils';
import { updateRecurringAmount, cancelRecurringRule } from '@/db/transactionActions';
import { LiftedField } from '@/components/lifted-input';
import { Alert } from 'react-native';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { usePreferencesStore } from '@/store/usePreferencesStore';

function readBudget() {
  const db = getDb();
  return { categories: db.select().from(categories).all(), transactions: db.select().from(transactions).all(), rules: db.select().from(recurringTransactions).all() };
}
export default function BudgetScreen() {
  useThemeRefresh();
  const { budgetMonth, setBudgetMonth, openAddSheet } = useUIStore();
  const { data, error, refresh } = useLocalData(readBudget);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const threshold = usePreferencesStore(state => state.preferences.budgetThreshold);
  const [editingRule, setEditingRule] = useState<RecurringTransaction | null>(null);
  const [ruleAmount, setRuleAmount] = useState('');
  const saveRule = () => {
    try { if (editingRule) updateRecurringAmount(getDb(), editingRule.id, parseToCentavos(ruleAmount)); setEditingRule(null); useCalendarSync.getState().triggerRefresh(); }
    catch (error) { Alert.alert('Could not update rule', error instanceof Error ? error.message : 'Please try again.'); }
  };
  const budget = data ? buildBudget(budgetMonth, data.categories, data.transactions, data.rules) : null;
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <TopBar featureName="Budget" />
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: layout.tabContentBottomPadding + insets.bottom }}>
      <SheetSection gap="lg">
        <FormRow label={<Text style={{ color: colors.text, fontSize: 24, fontFamily: 'Inter_500Medium' }}>{parseISODate(budgetMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>}
          right={<View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setBudgetMonth(shiftMonth(budgetMonth, -1))}><ChevronLeft color={colors.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} onPress={() => setBudgetMonth(shiftMonth(budgetMonth, 1))}><ChevronRight color={colors.text} size={22} /></Pressable>
          </View>} />
        {error ? <EmptyState variant="full" title="Couldn't load budget" actionLabel="Try again" onAction={refresh} description="Please try reading your ledger again." />
          : !budget ? <ActivityIndicator color={colors.money} /> : <>
          <FormCard style={{ backgroundColor: colors.surface }}><SheetSection gap="sm">
            <Text style={{ color: colors['text-muted'] }}>MONTHLY SUMMARY</Text>
            <FormRow label="Income" right={<Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>{formatCurrency(budget.income)}</Text>} />
            <FormRow label="Expenses" right={<Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>{formatCurrency(budget.expenses)}</Text>} />
            {(() => {
              const isDeficit = budget.remaining < 0;
              return (
                <FormRow
                  label={
                    <View>
                      <Text style={{ color: colors.text, fontSize: 16, fontFamily: 'Inter_500Medium' }}>Remaining</Text>
                      {isDeficit && (
                        <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 }}>
                          Deficit · Over budget by {formatCurrency(Math.abs(budget.remaining))}
                        </Text>
                      )}
                    </View>
                  }
                  right={
                    <Text
                      style={{
                        color: isDeficit ? colors.error : colors.primary,
                        fontSize: 24,
                        fontFamily: 'Inter_600SemiBold',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatCurrency(budget.remaining)}
                    </Text>
                  }
                />
              );
            })()}
          </SheetSection></FormCard>
          {budget.entries.length === 0 && <FormCard style={{ backgroundColor: colors.surface }}>
            <EmptyState variant="full" title="No spending logged yet" description="Track quiet daily purchases or archival notes with mindful precision." actionLabel="Log an expense" actionModule="money"
              icon={<Receipt size={22} color={colors['on-money']} />} onAction={() => openAddSheet('transaction')} />
          </FormCard>}
          {budget.recurring.length > 0 && <SheetSection>
            <Text style={{ color: colors.text, fontSize: 16 }}>Recurring obligations</Text>
            {budget.recurring.map(rule => <FormCard key={rule.id} onPress={() => { setEditingRule(rule); setRuleAmount((rule.amount / 100).toFixed(2)); }}><FormRow label={rule.note || data?.categories.find(category => category.id === rule.categoryId)?.name || 'Recurring entry'}
              value={parseISODate(rule.dueDate).toLocaleDateString()} right={<Text style={{ color: colors['on-money'] }}>{formatCurrency(rule.amount)}</Text>} /></FormCard>)}
          </SheetSection>}
          <SheetSection>
            <FormRow label={<Text style={{ color: colors.text, fontSize: 16 }}>Categories</Text>} right={<Pressable onPress={() => router.push('/categories')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary }}>Manage</Text></Pressable>} />
            {budget.categoryRows.map(category => <FormCard key={category.id} style={{ backgroundColor: colors.surface }}><SheetSection gap="sm">
              <FormRow icon={<CategoryIcon name={category.icon} />} label={category.name}
                right={<Text style={{ color: colors.text, fontVariant: ['tabular-nums'] }}>{formatCurrency(category.spent)}</Text>} />
              {category.monthlyCap !== null && category.monthlyCap > 0 && (() => {
                const alertStatus = budgetAlert(category.spent, category.monthlyCap, threshold);
                const isOver = alertStatus === 'over';
                const isReached = alertStatus === 'reached';
                const isNear = alertStatus === 'near';
                return (
                  <>
                    <ProgressBar
                      module={isOver ? 'error' : 'money'}
                      progress={Math.min(1, category.spent / category.monthlyCap)}
                    />
                    <Text style={{ color: colors['text-muted'], fontSize: 12 }}>
                      {formatCurrency(category.monthlyCap)} cap
                    </Text>
                    {alertStatus && (
                      <Text
                        accessibilityRole="alert"
                        style={{
                          color: isOver ? colors.error : isReached ? colors.text : colors['text-muted'],
                          fontSize: 12,
                          fontFamily: isOver ? 'Inter_500Medium' : 'Inter_400Regular',
                        }}
                      >
                        {isNear ? 'Approaching cap' : isReached ? 'Cap reached' : 'Over cap'}
                        {' · '}
                        {formatCurrency(Math.max(0, category.monthlyCap - category.spent))} remaining
                      </Text>
                    )}
                  </>
                );
              })()}
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
    <EditorSheet visible={editingRule !== null} title="Recurring entry" onClose={() => setEditingRule(null)} onSave={saveRule}>
      <SheetSection><FormCard><LiftedField id="recurring-amount" label="Future amount" value={ruleAmount} onChangeText={setRuleAmount} keyboardType="decimal-pad" fieldOrder={['recurring-amount']} /></FormCard>
        <Text style={{ color: colors['text-muted'] }}>Applies to future entries. Already logged entries keep their amounts.</Text>
        <Button title="Stop future entries" variant="secondary" onPress={() => Alert.alert('Stop this recurring entry?', 'Past entries stay in your history.', [
          { text: 'Cancel', style: 'cancel' }, { text: 'Stop repeats', onPress: () => {
            try { if (editingRule) cancelRecurringRule(getDb(), editingRule.id); setEditingRule(null); useCalendarSync.getState().triggerRefresh(); }
            catch { Alert.alert('Could not stop repeats', 'Please try again.'); }
          } },
        ])} />
      </SheetSection>
    </EditorSheet>
  </View>;
}
