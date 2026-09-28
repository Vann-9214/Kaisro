import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { TopBar, FormCard, FormRow, SheetSection, Chip, Button } from '@/components/ui';
import { EditorSheet } from '@/components/ui/EditorSheet';
import { CategoryIcon, categoryIcons } from '@/components/ui/CategoryIcon';
import { LiftedField } from '@/components/lifted-input';
import { colors, spacing } from '@/constants/theme';
import { formatCurrency, parseToCentavos, CURRENCY } from '@/constants/currency';
import { useLocalData } from '@/hooks/useLocalData';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { getDb, categories, type Category } from '@/db';
import { saveCategory, deleteCategory, categoryUsage } from '@/db/categoryActions';

const read = () => getDb().select().from(categories).all();
export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, error, refresh } = useLocalData(read);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [cap, setCap] = useState('');
  const [moving, setMoving] = useState<Category | null>(null);
  const [moveTo, setMoveTo] = useState<number | null>(null);
  const open = (category?: Category) => {
    setEditing(category ?? 'new'); setName(category?.name ?? ''); setIcon(category?.icon ?? 'tag');
    setCap(category?.monthlyCap === null || category === undefined ? '' : (category.monthlyCap / 100).toFixed(2));
  };
  const save = () => {
    try {
      if (cap.trim() && parseToCentavos(cap) <= 0) throw new Error('Enter a positive cap with up to two decimal places.');
      saveCategory(getDb(), { name, icon, monthlyCap: cap.trim() ? parseToCentavos(cap) : null }, editing === 'new' ? undefined : editing?.id);
      setEditing(null); useCalendarSync.getState().triggerRefresh(); refresh();
    } catch (error) { Alert.alert('Could not save category', error instanceof Error ? error.message : 'Please try again.'); }
  };
  const confirmDelete = (category: Category, target?: number) => {
    Alert.alert('Delete category?', target ? 'Its transactions and monthly rules will move to the selected category.' : 'This unused category will be removed.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete category', onPress: () => {
        try { deleteCategory(getDb(), category.id, target); setMoving(null); useCalendarSync.getState().triggerRefresh(); refresh(); }
        catch (error) { Alert.alert('Could not delete category', error instanceof Error ? error.message : 'Please try again.'); }
      } },
    ]);
  };
  const requestDelete = (category: Category) => {
    try {
      if (categoryUsage(getDb(), category.id) > 0) {
        setMoving(category); setMoveTo(data?.find(row => row.name.toLowerCase() === 'other')?.id ?? null);
      } else confirmDelete(category);
    } catch { Alert.alert('Could not check category', 'Please try again.'); }
  };
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <TopBar featureName="Categories" rightAction={<Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to Budget" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={20} color={colors.primary} /></Pressable>} />
    <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing['2xl'] }}>
      <SheetSection gap="lg">
        <Button title="Add category" onPress={() => open()} fullWidth />
        {error ? <Text style={{ color: colors.text }} onPress={refresh}>Could not load categories. Tap to retry.</Text> : data?.map(category => <FormCard key={category.id} style={{ backgroundColor: colors.surface }}>
          <FormRow icon={<CategoryIcon name={category.icon} />} label={<Pressable onPress={() => open(category)} accessibilityRole="button" accessibilityLabel={'Edit ' + category.name} style={{ minHeight: 44, justifyContent: 'center' }}><Text numberOfLines={2} style={{ color: colors.text }}>{category.name}</Text></Pressable>}
            value={category.monthlyCap === null ? 'No cap' : formatCurrency(category.monthlyCap) + ' cap'}
            right={category.name.toLowerCase() !== 'other' ? <Pressable onPress={() => requestDelete(category)} accessibilityRole="button" accessibilityLabel={'Delete ' + category.name} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Trash2 size={18} color={colors['text-muted']} /></Pressable> : undefined} />
        </FormCard>)}
        {moving && <FormCard style={{ backgroundColor: colors.surface }}><SheetSection>
          <Text style={{ color: colors.text }}>Move entries from {moving.name} to:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {data?.filter(row => row.id !== moving.id).map(row => <Chip key={row.id} label={row.name} selected={moveTo === row.id} onPress={() => setMoveTo(row.id)} />)}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Button title="Cancel" variant="ghost" onPress={() => setMoving(null)} />
            <Button title="Move and delete" variant="secondary" onPress={() => moveTo && confirmDelete(moving, moveTo)} disabled={!moveTo} />
          </View>
        </SheetSection></FormCard>}
      </SheetSection>
    </ScrollView>
    <EditorSheet visible={editing !== null} onClose={() => setEditing(null)} onSave={save} title={editing === 'new' ? 'Add category' : 'Edit category'}>
      <SheetSection>
        <FormCard><LiftedField id="category-name" label="Name" placeholder="Category name" value={name} onChangeText={setName} fieldOrder={['category-name', 'category-cap']} /></FormCard>
        <FormCard><SheetSection gap="sm"><Text style={{ color: colors['text-muted'] }}>Icon</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {categoryIcons.map(key => <Chip key={key} label={key} icon={<CategoryIcon name={key} size={14} />} selected={icon === key} onPress={() => setIcon(key)} />)}
          </View>
        </SheetSection></FormCard>
        <FormCard><LiftedField id="category-cap" label="Monthly cap (optional)" placeholder="No cap" prefix={CURRENCY.symbol} value={cap} onChangeText={setCap} keyboardType="decimal-pad" fieldOrder={['category-name', 'category-cap']} /></FormCard>
      </SheetSection>
    </EditorSheet>
  </View>;
}
