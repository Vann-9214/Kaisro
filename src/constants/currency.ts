/**
 * Currency configuration for Kaisro.
 * Defined as a single central constant so currency symbol and formatting can be adjusted later.
 */

export const CURRENCY = {
  symbol: '₱',
  code: 'PHP',
  name: 'Philippine Peso',
} as const;

export type CurrencyConfig = typeof CURRENCY;

/**
 * Format integer centavos to formatted currency string (e.g. 125050 -> "₱1,250.50")
 * @param amountInCentavos Amount stored in integer centavos
 * @param showDecimals Whether to always show two decimal places (defaults to true)
 */
export function formatCurrency(amountInCentavos: number, showDecimals: boolean = true): string {
  const isNegative = amountInCentavos < 0;
  const absAmount = Math.abs(amountInCentavos);
  const pesos = Math.floor(absAmount / 100);
  const centavos = absAmount % 100;

  const formattedPesos = pesos.toLocaleString('en-PH');
  const sign = isNegative ? '-' : '';

  if (showDecimals || centavos > 0) {
    const formattedCentavos = centavos.toString().padStart(2, '0');
    return `${sign}${CURRENCY.symbol}${formattedPesos}.${formattedCentavos}`;
  }

  return `${sign}${CURRENCY.symbol}${formattedPesos}`;
}

/**
 * Parse a decimal string or number (e.g. "125.50") into integer centavos (12550).
 */
export function parseToCentavos(amount: string | number): number {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }
  const cleanStr = amount.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}
