import React, { useImperativeHandle } from 'react';
import { View, Text, Pressable, Switch, Alert } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { eq } from 'drizzle-orm';
import { getDb, categories, recurringTransactions } from '@/db';
import { saveTransaction, deleteTransaction, catchUpMonthly } from '@/db/transactionActions';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { CURRENCY, parseToCentavos } from '@/constants/currency';
import { colors, spacing } from '@/constants/theme';
import { FormCard, FormRow, SheetSection, SegmentedControl, Chip } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { LiftedField, useLiftedInput } from '@/components/lifted-input';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export const ExpenseForm = React.forwardRef<QuickAddFormHandle, QuickAddFormProps>(
  function ExpenseForm({ onClose }, ref) {
    const { editingTransaction, transactionDate, setTransactionDate, selectedDate } = useUIStore();
    const { closeBar } = useLiftedInput();
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
    return <SheetSection>
      <SegmentedControl options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        selectedValue={watch('type')} onChange={value => setValue('type', value)} />
      <FormCard><Controller control={control} name="amount"
        rules={{ validate: value => parseToCentavos(value) > 0 || 'Enter a positive amount with up to two decimal places' }}
        render={({ field }) => <LiftedField id="amount" label="Amount" placeholder="0.00" prefix={CURRENCY.symbol} value={field.value}
          onChangeText={field.onChange} keyboardType="decimal-pad" error={errors.amount?.message} fieldOrder={['amount', 'description']} />} /></FormCard>
      <FormCard><SheetSection gap="sm"><Text style={{ color: colors['text-muted'] }}>Category</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {categoryRows.map(category => <Chip key={category.id} label={category.name} icon={<CategoryIcon name={category.icon} size={14} />}
            selected={watch('categoryId') === category.id} onPress={() => { closeBar(); setValue('categoryId', category.id); }} />)}
        </View>
      </SheetSection></FormCard>
      <FormCard><Controller control={control} name="note" render={({ field }) => <LiftedField id="description" label="Description" placeholder="What was this for?"
        value={field.value} onChangeText={field.onChange} fieldOrder={['amount', 'description']} />} /></FormCard>
      <DateTimeField value={transactionDate} onChange={value => { if (value) setTransactionDate(value); }} fallbackDate={selectedDate} />
      <FormCard><FormRow label="Repeats monthly"
        value={rule ? 'Edits apply to this entry. Turning this off stops future entries.' : 'Uses this date each month, or the last day of shorter months.'}
        right={<Switch value={watch('repeats')} onValueChange={value => setValue('repeats', value)} trackColor={{ true: colors.money, false: colors.border }} />} /></FormCard>
      {editingTransaction && <Pressable onPress={remove} accessibilityRole="button" style={{ minHeight: 44, padding: spacing.md, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors['text-muted'] }}>Delete entry</Text></Pressable>}
    </SheetSection>;
  }
);
export default ExpenseForm;
