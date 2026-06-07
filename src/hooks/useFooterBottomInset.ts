import {
  useSafeAreaInsets,
  type EdgeInsets,
} from 'react-native-safe-area-context';

const FOOTER_GAP_ABOVE_BOTTOM = 8;
const FOOTER_MIN_BOTTOM = 12;
const FOOTER_BUTTON_HEIGHT = 56;
const FOOTER_BUTTON_GAP = 12;
const FOOTER_CONTENT_GAP = 24;

/** Scroll clearance below scroll content for pinned footer actions. */
export function footerScrollClearance(footerButtonCount: 1 | 2): number {
  if (footerButtonCount === 1) {
    return FOOTER_BUTTON_HEIGHT + FOOTER_CONTENT_GAP;
  }
  return FOOTER_BUTTON_HEIGHT * 2 + FOOTER_BUTTON_GAP + FOOTER_CONTENT_GAP;
}

/** @deprecated Prefer `footerScrollClearance(2)` — kept for two-button footers. */
export const FOOTER_SCROLL_CLEARANCE = footerScrollClearance(2);

function resolveFooterBottom(insets: EdgeInsets): number {
  return Math.max(insets.bottom, FOOTER_MIN_BOTTOM) + FOOTER_GAP_ABOVE_BOTTOM;
}

type UseFooterLayoutOptions = {
  /** Stacked footer buttons (56px each; 12px gap when 2). Default 2. */
  footerButtonCount?: 1 | 2;
};

/** Footer bottom offset and matching ScrollView content padding. */
export function useFooterLayout(
  options: UseFooterLayoutOptions = {},
): {
  footerBottom: number;
  scrollPaddingBottom: number;
} {
  const {footerButtonCount = 2} = options;
  const insets = useSafeAreaInsets();
  const footerBottom = resolveFooterBottom(insets);
  return {
    footerBottom,
    scrollPaddingBottom:
      footerBottom + footerScrollClearance(footerButtonCount),
  };
}
