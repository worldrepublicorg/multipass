import {StyleSheet, Platform, StatusBar} from 'react-native';

import {sansTextStyle} from '../../theme/fonts';

/** Aligned with @worldcoin/mini-apps-ui-kit-react (world-republic web app). */
export const colors = {
  primary: '#050505',
  primaryLight: '#f3f4f5',
  primaryDark: '#3c424b',
  infoLight: '#e6f0ff',
  infoBorder: '#cce0ff',

  background: '#ffffff',
  surface: '#f3f4f5',
  surfaceDark: '#f9fafb',

  text: '#181818',
  textSecondary: '#717680',
  textMuted: '#9ba3ae',
  textOnDark: '#ffffff',
  textOnDarkMuted: '#d6d9dd',

  success: '#00c230',
  successLight: '#e6f9ec',
  successDark: '#33d167',
  successBorder: '#ccf3d9',

  error: '#f2280d',
  errorLight: '#fee9e7',
  errorDark: '#f7803f',
  errorBorder: '#fdd3cf',

  warning: '#ffae00',
  warningLight: '#fff6e6',
  warningDark: '#ffb833',
  warningBorder: '#ffedcc',

  border: '#ebecef',
  borderLight: '#f3f4f5',

  cardShadow: '#191c20',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

/** world-republic Menu `CustomListItem`: `bg-gray-50` (`#f9fafb` → `surfaceDark`, not `surface`). */
export const menuListIcon = {
  size: 20,
  slotSize: 20,
  color: colors.textMuted,
  weight: 'regular' as const,
};

/** world-republic Menu external links: `PiArrowSquareOut size-4 text-gray-400` */
export const menuListEndIcon = {
  size: 16,
  color: colors.textMuted,
  weight: 'regular' as const,
};

/** world-republic subpage back: `size-10 rounded-full bg-gray-100` + `PiCaretLeft size-4 text-gray-900` */
export const screenBackIcon = {
  size: 16,
  slotSize: 16,
  color: colors.text,
  weight: 'regular' as const,
};

export const SCREEN_BACK_BUTTON_SIZE = 40;

/** AppHeader toolbar horizontal inset (logo bar). */
export const APP_HEADER_PADDING_H = 22;

/** ScreenBackHeader and other back-arrow toolbars. */
export const SCREEN_BACK_TOOLBAR_PADDING_H = 16;

export const borderRadius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
};

export const typography = {
  /** mini-apps-ui-kit Typography `heading` level 2 (`text-3xl`). */
  heading2: {
    ...sansTextStyle('600'),
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.3,
    color: colors.text,
  },
  title: {
    ...sansTextStyle('600'),
    fontSize: 28,
    lineHeight: 32,
    color: colors.text,
  },
  /** mini-apps-ui-kit Typography `heading` level 3 (`text-2xl` + `leading-narrow`). */
  heading3: {
    ...sansTextStyle('600'),
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.26,
    color: colors.text,
  },
  sectionTitle: {
    ...sansTextStyle('600'),
    fontSize: 18,
    color: colors.text,
  },
  /** mini-apps-ui-kit Typography `subtitle` level 2 (`text-base`). */
  subtitle2: {
    ...sansTextStyle('500'),
    fontSize: 16,
    lineHeight: 19.2,
    color: colors.textSecondary,
  },
  subtitle: {
    ...sansTextStyle('400'),
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  /**
   * mini-apps-ui-kit Typography `subtitle` level 3 (`text-sm` + `leading-narrow`).
   * ui-kit overrides Tailwind: text-sm = 0.9375rem (15px), not 14px; line-height 1.2.
   */
  subtitle3: {
    ...sansTextStyle('500'),
    fontSize: 15,
    lineHeight: 18,
  },
  body: {
    ...sansTextStyle('400'),
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  /**
   * mini-apps-ui-kit Typography `body` level 3 (`text-sm` + `leading-compact`).
   * world-republic: `Typography variant="body" level={3}` (often 14px / leading-normal).
   */
  body3: {
    ...sansTextStyle('400'),
    fontSize: 14,
    lineHeight: 21,
  },
  /**
   * mini-apps-ui-kit Typography `body` level 4 (`text-xs` + `leading-compact`).
   * ui-kit: xs = 0.8125rem (13px), line-height 1.3 → ~17px.
   */
  body4: {
    ...sansTextStyle('400'),
    fontSize: 13,
    lineHeight: 17,
  },
  label: {
    ...sansTextStyle('600'),
    fontSize: 13,
    color: colors.textSecondary,
  },
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenPad: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 56,
  },
  /** Scroll content below a fixed ScreenBackHeader. */
  screenBody: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 56,
  },
  /** world-republic Menu scroll area: `px-6 pt-4` (+ app bottom inset). */
  menuScreenBody: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: 56,
  },
  screenScroll: {
    flex: 1,
  },
  screenCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0,
  },
  pageHeader: {
    marginTop: 8,
    marginBottom: 12,
  },
  pageTitle: {
    ...typography.title,
  },
  pageSubtitle: {
    ...typography.subtitle,
    marginTop: 6,
  },
  flowStepsGap: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
  gap8: {
    gap: 8,
  },
  gap12: {
    gap: 12,
  },
  gap16: {
    gap: 16,
  },
  /** Pinned footer actions — pair with `useFooterLayout().footerBottom`. */
  footerActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 20,
  },
  mt8: {marginTop: 8},
  mt12: {marginTop: 12},
  mt16: {marginTop: 16},
  mt24: {marginTop: 24},
  mb8: {marginBottom: 8},
  mb12: {marginBottom: 12},
  mb16: {marginBottom: 16},
});

/** world-republic Menu section blocks: `gap-8` between sections, `mb-4` title, `gap-2` items. */
export const menuScreenStyles = StyleSheet.create({
  sections: {
    gap: spacing.xxl,
  },
  sectionTitle: {
    ...typography.subtitle3,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  sectionItems: {
    gap: spacing.sm,
  },
});

/** world-republic Wallet `TransactionHistoryContent` empty copy. */
export const historyScreenStyles = StyleSheet.create({
  emptyText: {
    ...sansTextStyle('400'),
    fontSize: 15,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
});

/** Centered empty states (Boot / ID home). */
export const referendumEmptyState = StyleSheet.create({
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  logo: {
    marginBottom: spacing.lg,
  },
  /** Feature rows: `h-6 w-6` circle + muted fill icon (About / add-ID intro). */
  featureIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: {
    ...typography.heading2,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    ...typography.subtitle2,
    textAlign: 'center',
    width: '100%',
  },
  /** With column gap (16) + last feature row margin (9) → 42px above button. */
  buttonWrap: {
    marginTop: 17,
    alignSelf: 'stretch',
  },
});
