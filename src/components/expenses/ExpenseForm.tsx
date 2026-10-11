import React, { useImperativeHandle, useState } from 'react';
import { Text, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import { eq } from 'drizzle-orm';
import { getDb, categories, recurringTransactions } from '@/db';
import { saveTransaction, deleteTransaction, catchUpMonthly } from '@/db/transactionActions';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { CURRENCY, parseToCentavos } from '@/constants/currency';
import { colors, layout, spacing } from '@/constants/theme';
import { FormCard, FormRow, SheetSection, SegmentedControl, BottomSheet } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { LiftedField, useLiftedInput } from '@/components/lifted-input';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export const ExpenseForm = React.forwardRef<QuickAddFormHandle, QuickAddFormProps>(
  function ExpenseForm({ onClose }, ref) {
    const { editingTransaction, transactionDate, setTransactionDate, selectedDate } = useUIStore();
    const { closeBar } = useLiftedInput();
    const insets = useSafeAreaInsets();
    const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
    const categoryRows = getDb().select().from(categories).all();
    const rule = editingTransaction?.recurringId ? getDb().select().from(recurringTransactions).where(eq(recurringTransactions.id, editingTransaction.recurringId)).get() : null;
    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<{
      amount: string; note: string; type: 'expense' | 'income'; categoryId: number | null; repeats: boolean;
    }>({ defaultValues: {
      amount: editingTransaction ? (editingTransaction.amount / 100).toFixed(2) : '',
      note: editingTransaction?.note ?? '', type: editingTransaction?.type === 'income' ? 'income' : 'expense',
      categoryId: editingTransaction?.categoryId ?? categoryRows.find(category => category.name === 'Other')?.id ?? categoryRows[0]?.id ?? null,
      repeats: Boolean(rule && !rule.endDate),
    } });
    useImperativeHandle(ref, () => ({ submit: async () => {
      let success = false;
      await handleSubmit(values => {
        try {
          saveTransaction(getDb(), { ...values, amount: parseToCentavos(values.amount), date: transactionDate }, editingTransaction?.id);
          catchUpMonthly(getDb());
          useCalendarSync.getState().triggerRefresh(); success = true; onClose();
        } catch (error) { Alert.alert('Could not save entry', error instanceof Error ? error.message : 'Please try again.'); }
      })();
      return success;
    } }));
    const remove = () => {
      if (!editingTransaction) return;
      closeBar();
      Alert.alert('Delete entry?', rule ? 'Only this entry will be removed. Its monthly rule will remain.' : 'This entry will be removed.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Delete entry', onPress: () => {
          try { deleteTransaction(getDb(), editingTransaction.id); useCalendarSync.getState().triggerRefresh(); onClose(); }
          catch { Alert.alert('Could not delete entry', 'Please try again.'); }
        } },
      ]);
    };
    const selectedCategory = categoryRows.find(category => category.id === watch('categoryId'));
    return <SheetSection fill>
      <SegmentedControl options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        selectedValue={watch('type')} onChange={value => setValue('type', value)} />
      <FormCard compact><Controller control={control} name="amount"
        rules={{ validate: value => parseToCentavos(value) > 0 || 'Enter a positive amount with up to two decimal places' }}
        render={({ field }) => <LiftedField id="amount" label="Amount" placeholder="0.00" prefix={CURRENCY.symbol} value={field.value}
          onChangeText={field.onChange} keyboardType="decimal-pad" error={errors.amount?.message} fieldOrder={['amount', 'description']} />} /></FormCard>
      <FormCard compact onPress={() => { closeBar(); setCategoryPickerOpen(true); }}
        accessibilityLabel={`Category: ${selectedCategory?.name ?? 'None'}`}>
        <FormRow label="Category" value={selectedCategory?.name ?? 'Select category'}
          icon={selectedCategory ? <CategoryIcon name={selectedCategory.icon} size={16} /> : undefined}
          right={<ChevronRight size={16} color={colors['text-muted']} />} />
      </FormCard>
      <FormCard compact><Controller control={control} name="note" render={({ field }) => <LiftedField id="description" label="Description" placeholder="What was this for?"
        value={field.value} onChangeText={field.onChange} fieldOrder={['amount', 'description']} />} /></FormCard>
      <DateTimeField compact value={transactionDate} onChange={value => { if (value) setTransactionDate(value); }} fallbackDate={selectedDate} />
      <FormCard compact><FormRow label="Repeats monthly"
        value={rule ? 'Off stops future entries.' : 'Last day if the month is shorter.'}
        right={<Switch accessibilityLabel="Repeats monthly"
          accessibilityHint={rule ? 'Edits apply to this entry. Turning this off stops future entries.' : 'Uses this date each month, or the last day of shorter months.'}
          value={watch('repeats')} onValueChange={value => setValue('repeats', value)} trackColor={{ true: colors.money, false: colors.border }} />} /></FormCard>
      {editingTransaction && <Pressable onPress={remove} accessibilityRole="button" style={{ minHeight: 44, padding: spacing.md, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors['text-muted'] }}>Delete entry</Text></Pressable>}
      <BottomSheet visible={categoryPickerOpen} onClose={() => setCategoryPickerOpen(false)}
        title={<FormRow label="Category" right={<Pressable onPress={() => setCategoryPickerOpen(false)}
          accessibilityRole="button" accessibilityLabel="Close category picker"
          style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <Text style={{ color: colors.primary }}>Done</Text>
        </Pressable>} />}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
          paddingHorizontal: layout.sheetHorizontalPadding, paddingBottom: insets.bottom + spacing.lg,
        }}>
          <SheetSection>
            {categoryRows.map(category => <FormCard compact key={category.id}
              onPress={() => { setValue('categoryId', category.id); setCategoryPickerOpen(false); }}
              accessibilityLabel={category.name} accessibilityState={{ selected: watch('categoryId') === category.id }}>
              <FormRow label={category.name} icon={<CategoryIcon name={category.icon} size={16} />}
                right={watch('categoryId') === category.id ? <Check size={16} color={colors.money} /> : undefined} />
            </FormCard>)}
          </SheetSection>
        </ScrollView>
      </BottomSheet>
    </SheetSection>;
  }
);
export default ExpenseForm;
