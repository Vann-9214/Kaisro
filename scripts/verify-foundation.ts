import { CURRENCY, formatCurrency, parseToCentavos } from '../src/constants/currency';
import { lightTokens, darkTokens, ThemeColorTokens } from '../src/constants/theme';
import * as schema from '../src/db/schema';

console.log('=== 1. VERIFYING CURRENCY CONFIGURATION ===');
console.log(`Currency Symbol: ${CURRENCY.symbol}`);
console.log(`Currency Code: ${CURRENCY.code}`);
console.log(`Currency Name: ${CURRENCY.name}`);

const sampleCentavos = 125050; // ₱1,250.50
const formatted = formatCurrency(sampleCentavos);
console.log(`Formatted sample: 125050 centavos -> ${formatted}`);
if (formatted !== '₱1,250.50') {
  throw new Error(`Currency formatting mismatch: expected ₱1,250.50, got ${formatted}`);
}

const parsed = parseToCentavos('₱1,250.50');
console.log(`Parsed sample: "₱1,250.50" -> ${parsed} centavos`);
if (parsed !== 125050) {
  throw new Error(`Currency parsing mismatch: expected 125050, got ${parsed}`);
}

console.log('\n=== 2. VERIFYING SEMANTIC THEME TOKENS ===');
const requiredTokens: (keyof ThemeColorTokens)[] = [
  'background',
  'surface',
  'surface-raised',
  'overlay',
  'text',
  'text-muted',
  'border',
  'primary',
  'tasks',
  'money',
  'on-primary',
  'on-tasks',
  'on-money',
];

console.log('Checking light tokens:');
for (const token of requiredTokens) {
  if (!lightTokens[token]) {
    throw new Error(`Missing light token: ${token}`);
  }
  console.log(`  ✓ light.${token} = ${lightTokens[token]}`);
}

console.log('Checking dark tokens (placeholders):');
for (const token of requiredTokens) {
  if (!darkTokens[token]) {
    throw new Error(`Missing dark token: ${token}`);
  }
  console.log(`  ✓ dark.${token} = ${darkTokens[token]}`);
}

console.log('\n=== 3. VERIFYING DRIZZLE SCHEMA TABLES ===');
const requiredTables = [
  'events',
  'tasks',
  'subtasks',
  'categories',
  'transactions',
  'recurringTransactions',
  'notes',
  'noteLinks',
  'tags',
  'noteTags',
] as const;

for (const tableName of requiredTables) {
  if (!(tableName in schema)) {
    throw new Error(`Missing schema table: ${tableName}`);
  }
  console.log(`  ✓ Table defined: ${tableName}`);
}

console.log('\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY ===');
