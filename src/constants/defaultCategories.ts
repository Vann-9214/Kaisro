export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  monthlyCap: null;
}

/**
 * Default starter categories for Kaisro.
 * All starter categories start with NO monthly cap (monthlyCap = null).
 */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Housing', icon: 'home', color: 'primary', monthlyCap: null },
  { name: 'Groceries', icon: 'shopping-cart', color: 'money', monthlyCap: null },
  { name: 'Food & Dining', icon: 'utensils', color: 'money', monthlyCap: null },
  { name: 'Utilities', icon: 'zap', color: 'tasks', monthlyCap: null },
  { name: 'Transport', icon: 'car', color: 'primary', monthlyCap: null },
  { name: 'Coffee & Snacks', icon: 'coffee', color: 'money', monthlyCap: null },
  { name: 'Health', icon: 'heart', color: 'tasks', monthlyCap: null },
  { name: 'Other', icon: 'more-horizontal', color: 'text-muted', monthlyCap: null },
] as const;
