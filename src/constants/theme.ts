/**
 * Kaisro Semantic Theme Tokens
 *
 * Core Color Mapping:
 * - Blue (Primary): Calendar and events (#3A4A7A - Ink Blue)
 * - Teal (Tasks): Tasks and completed/done states (#6FA8A0 - Soft Teal)
 * - Sand (Money): Anything money-related, ledgers, expenses (#E8C99B - Warm Sand)
 *
 * All values align with the Stitch "Serene Editorial Minimal" design system.
 * Dark mode tokens are clearly marked placeholders that currently fall back to light.
 */

export interface ThemeColorTokens {
  background: string;
  surface: string;
  'surface-raised': string;
  overlay: string;
  text: string;
  'text-muted': string;
  border: string;
  primary: string;
  tasks: string;
  money: string;
  'on-primary': string;
  'on-tasks': string;
  'on-money': string;
  error: string;
  'on-error': string;
}

export const lightTokens: ThemeColorTokens = {
  // Foundational canvas - unbleached linen cream
  background: '#FAF7F2',

  // Surface cards and panels
  surface: '#FFFFFF',

  // Lifted surfaces (modals, sheets, floating elements)
  'surface-raised': '#FFFFFF',

  // Dimmed backdrop behind bottom sheets and modals
  overlay: 'rgba(51, 49, 46, 0.4)',

  // Primary body text - soft charcoal (replaces harsh #000000)
  text: '#33312E',

  // Secondary metadata, timestamps, placeholders
  'text-muted': '#7A756D',

  // Hairline borders, dividers, timeline tracks
  border: '#E2DED7',

  // Module: Calendar & Events (Archival Ink Blue)
  primary: '#3A4A7A',

  // Module: Tasks & Done states (Soft Sage Teal)
  tasks: '#6FA8A0',

  // Module: Money, Budget & Ledgers (Warm Sand)
  money: '#E8C99B',

  // Text/icons on primary (Ink Blue)
  'on-primary': '#FFFFFF',

  // Text/icons on tasks (Soft Teal)
  'on-tasks': '#FFFFFF',

  // High-contrast text/icon color on money (Warm Sand) - Deep Amber (#785B28) as defined in Stitch
  'on-money': '#785B28',

  // Error & destructive actions
  error: '#BA1A1A',

  // Text/icons on error
  'on-error': '#FFFFFF',
};

/**
 * Dark Mode Token Placeholders
 * Currently falls back to light tokens as requested, with candidate dark hex values
 * preserved from the Stitch "Nocturne Focus" design system for future activation.
 */
const ENABLE_DARK_MODE_VALUES = false; // Flag to enable candidate dark values once ready

export const darkTokens: ThemeColorTokens = ENABLE_DARK_MODE_VALUES
  ? {
      background: '#0F141A',
      surface: '#1C222C',
      'surface-raised': '#2B3444',
      overlay: 'rgba(0, 0, 0, 0.65)',
      text: '#EDECE8',
      'text-muted': '#707987',
      border: '#27303E',
      primary: '#7F92C9',
      tasks: '#8FC4BC',
      money: '#E8D2AE',
      'on-primary': '#14181F',
      'on-tasks': '#14181F',
      'on-money': '#3B2E15',
      error: '#FFB4AB',
      'on-error': '#690005',
    }
  : {
      // CLEARLY MARKED PLACEHOLDER: Falls back to light mode tokens
      background: lightTokens.background,
      surface: lightTokens.surface,
      'surface-raised': lightTokens['surface-raised'],
      overlay: lightTokens.overlay,
      text: lightTokens.text,
      'text-muted': lightTokens['text-muted'],
      border: lightTokens.border,
      primary: lightTokens.primary,
      tasks: lightTokens.tasks,
      money: lightTokens.money,
      'on-primary': lightTokens['on-primary'],
      'on-tasks': lightTokens['on-tasks'],
      'on-money': lightTokens['on-money'],
      error: lightTokens.error,
      'on-error': lightTokens['on-error'],
    };

/**
 * Default active theme token set
 */
export const colors = lightTokens;

/**
 * Kaisro Spacing Scale (dp)
 * Aligned with the Stitch "Serene Editorial Minimal" design system:
 * - xs: 4dp (space-xs)
 * - sm: 8dp (space-sm)
 * - cardGap: 12dp (gutter-sm / card-to-card gap)
 * - md: 14dp (space-md - card vertical padding)
 * - base: 16dp (gutter / card horizontal padding / header gaps)
 * - lg: 20dp (space-lg / margin - sheet horizontal padding, body bottom padding)
 * - xl: 24dp (delete button top margin)
 * - 2xl: 32dp (space-xl)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  cardGap: 12,
  md: 14,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
} as const;

/**
 * Kaisro Layout & Sheet Geometry Rules
 * Standardized across all quick-add and edit sheets:
 */
export const layout = {
  // Sheet & Card padding
  sheetHorizontalPadding: spacing.lg,       // 20dp
  cardGap: 10,                              // 10dp card gap
  cardPaddingVertical: 12,                  // 12dp vertical card padding
  cardPaddingHorizontal: spacing.base,      // 16dp
  cardBorderRadius: 12,                     // 12dp
  cardBorderWidth: 1,                       // 1dp hairline
  singleLineMinHeight: 52,                  // 52dp min height for single-line cards

  // Inside card element spacing
  iconToLabelGap: spacing.cardGap,           // 12dp between icon and label
  labelToValueGap: spacing.xs,              // 4dp between label and value/hint line

  // Header geometry
  headerDragHandleBottom: spacing.xs,       // 4dp under drag handle
  headerTopPadding: spacing.base,           // 16dp above header content
  headerToSegmentedGap: spacing.cardGap,    // 12dp between header and segmented control
  segmentedToCardGap: spacing.cardGap,      // 12dp between segmented control and first card

  // Footer & buttons
  footerTopPadding: spacing.base,           // 16dp above Save button
  footerBottomExtraPadding: spacing.cardGap,// 12dp below button
  footerButtonHeight: 50,                   // 50dp Save button height
  deleteButtonTopMargin: spacing.lg,        // 20dp above Delete button
  deleteButtonBottomMargin: spacing.base,   // 16dp below Delete button
  bodyBottomPadding: spacing.base,          // 16dp bottom padding for scroll body

  // Accessibility / Font scaling cap
  maxFontScale: 1.3,
} as const;

/**
 * Module coding reference for components:
 * - blue: Calendar & Events
 * - teal: Tasks & Done states
 * - sand: Money & Budget
 */
export const moduleColors = {
  calendar: {
    base: colors.primary,
    onBase: colors['on-primary'],
  },
  events: {
    base: colors.primary,
    onBase: colors['on-primary'],
  },
  tasks: {
    base: colors.tasks,
    onBase: colors['on-tasks'],
  },
  money: {
    base: colors.money,
    onBase: colors['on-money'],
  },
} as const;

export default colors;
