import React, { useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Receipt, Tag } from 'lucide-react-native';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { useUIStore } from '@/store/useUIStore';
import { CURRENCY, parseToCentavos } from '@/constants/currency';
import { colors, spacing, layout } from '@/constants/theme';
import { FormCard } from '@/components/ui';
import { LiftedField } from '@/components/lifted-input/LiftedField';
import { useLiftedInput } from '@/components/lifted-input/LiftedInputContext';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export type ExpenseFormProps = QuickAddFormProps;

interface FormValues {
  amount: string;
  description: string;
  categoryId: number | null;
}

const EXPENSE_FIELD_ORDER = ['amount', 'description'];

export const ExpenseForm = React.forwardRef<QuickAddFormHandle, ExpenseFormProps>(
  function ExpenseForm({ onClose, scrollViewRef }, ref) {
    const { editingTransaction, selectedDateContext } = useUIStore();
    const isEditMode = Boolean(editingTransaction);
    const { closeBar } = useLiftedInput();
    const [categories, setCategories] = useState<schema.Category[]>([]);

    const {
      control,
      handleSubmit,
      watch,
      setValue,
      setError,
      clearErrors,
      formState: { errors },
    } = useForm<FormValues>({
      defaultValues: {
        amount: editingTransaction ? (editingTransaction.amount / 100).toFixed(2) : '',
        description: editingTransaction?.note || '',
        categoryId: editingTransaction?.categoryId ?? null,
      },
    });

    const selectedCategoryId = watch('categoryId');

    // Load categories
    useEffect(() => {
      async function loadCategories() {
        try {
          const db = getDb();
          const rows = await db.select().from(schema.categories);
          setCategories(rows);
          if (rows.length > 0 && selectedCategoryId === null && !editingTransaction) {
            setValue('categoryId', rows[0].id);
          }
        } catch (err) {
          console.error('[ExpenseForm] Failed to load categories:', err);
        }
      }
      loadCategories();
    }, [setValue, selectedCategoryId, editingTransaction]);

    // Load initial values if editingTransaction changes
    useEffect(() => {
      if (editingTransaction) {
        setValue('amount', (editingTransaction.amount / 100).toFixed(2));
        setValue('description', editingTransaction.note || '');
        if (editingTransaction.categoryId !== null) {
          setValue('categoryId', editingTransaction.categoryId);
        }
      }
    }, [editingTransaction, setValue]);

    const onSubmit = async (data: FormValues) => {
      const centavos = parseToCentavos(data.amount);
      if (centavos <= 0) {
        setError('amount', { message: 'Enter an amount greater than 0' });
        scrollViewRef?.current?.scrollTo({ y: 0, animated: true });
        throw new Error('Invalid amount');
      }

      try {
        const db = getDb();
        const now = new Date();
        const timePart = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        const dateStr = selectedDateContext
          ? `${selectedDateContext}T${timePart}`
          : now.toISOString();

        if (isEditMode && editingTransaction) {
          await db
            .update(schema.transactions)
            .set({
              amount: centavos,
              categoryId: data.categoryId,
              note: data.description.trim() || null,
              updatedAt: now.toISOString(),
            })
            .where(eq(schema.transactions.id, editingTransaction.id));
        } else {
          await db.insert(schema.transactions).values({
            type: 'expense',
            amount: centavos,
            categoryId: data.categoryId,
            date: dateStr,
            note: data.description.trim() || null,
          });
        }

        useCalendarSync.getState().triggerRefresh();
        onClose();
      } catch (err) {
        console.error('[ExpenseForm] Failed to save expense:', err);
        Alert.alert('Error', 'Failed to save expense.');
        throw err;
      }
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        let success = false;
        await handleSubmit(
          async (data) => {
            await onSubmit(data);
            success = true;
          },
          () => {
            scrollViewRef?.current?.scrollTo({ y: 0, animated: true });
            success = false;
          }
        )();
        return success;
      },
    }));

    const handleDelete = () => {
      if (!editingTransaction) return;
      Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDb();
              await db
                .delete(schema.transactions)
                .where(eq(schema.transactions.id, editingTransaction.id));
              useCalendarSync.getState().triggerRefresh();
              onClose();
            } catch (err) {
              console.error('[ExpenseForm] Failed to delete expense:', err);
              Alert.alert('Error', 'Failed to delete expense.');
            }
          },
        },
      ]);
    };

    return (
      <View style={{ gap: layout.cardGap }}>
        {/* 1. Amount Lifted Field Card */}
        <FormCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <Receipt size={16} color={colors['on-money']} />
            <Text
              maxFontSizeMultiplier={layout.maxFontScale}
              style={{
                marginLeft: spacing.xs,
                fontSize: 10,
                fontWeight: '600',
                color: colors['text-muted'],
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Amount ({CURRENCY.code})
            </Text>
          </View>

          <Controller
            control={control}
            name="amount"
            rules={{ required: 'Amount is required' }}
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="amount"
                label={`Amount (${CURRENCY.code})`}
                value={value}
                onChangeText={(val) => {
                  onChange(val);
                  if (val.trim()) clearErrors('amount');
                }}
                placeholder="0.00"
                hint="Tap to enter amount"
                error={errors.amount?.message}
                keyboardType="decimal-pad"
                prefix={CURRENCY.symbol}
                fieldOrder={EXPENSE_FIELD_ORDER}
              />
            )}
          />
        </FormCard>

        {/* 2. Category Selector (horizontal chips) */}
        {categories.length > 0 && (
          <FormCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Tag size={14} color={colors['text-muted']} />
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{
                  marginLeft: spacing.xs,
                  fontSize: 10,
                  fontWeight: '600',
                  color: colors['text-muted'],
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Category
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.sm }}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      closeBar();
                      setValue('categoryId', cat.id);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 9999,
                      borderWidth: 1,
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      maxFontSizeMultiplier={layout.maxFontScale}
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: isSelected ? colors['on-primary'] : colors.text,
                      }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </FormCard>
        )}

        {/* 3. Description / Note Lifted Field Card */}
        <FormCard singleLine>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="description"
                label="Description"
                value={value}
                onChangeText={onChange}
                placeholder="What was this for? (e.g. Lunch with team)"
                fieldOrder={EXPENSE_FIELD_ORDER}
              />
            )}
          />
        </FormCard>

        {/* Delete Button in Edit Mode */}
        {isEditMode && (
          <View
            style={{
              marginTop: layout.deleteButtonTopMargin,
              marginBottom: layout.deleteButtonBottomMargin,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              onPress={handleDelete}
              style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.base }}
              accessibilityRole="button"
              accessibilityLabel="Delete expense"
            >
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: colors.error,
                }}
              >
                Delete expense
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

export default ExpenseForm;
