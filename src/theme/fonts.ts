import {Platform, type TextStyle} from 'react-native';

/**
 * Typography aligned with world-republic (app/layout.tsx + globals.css):
 * TWK Lausanne is the primary UI typeface (--font-sans).
 */

const sansRegular = 'TWKLausanne-350';
const sansMedium = 'TWKLausanne-500';
const sansSemibold = 'TWKLausanne-600';

export function sansFamilyForWeight(weight?: TextStyle['fontWeight']): string {
  const numeric = weightToNumber(weight);
  if (numeric >= 600) {
    return sansSemibold;
  }
  if (numeric >= 500) {
    return sansMedium;
  }
  return sansRegular;
}

/**
 * Apply TWK Lausanne. Each weight is a separate font file — do not pass
 * fontWeight through to the OS or iOS/Android may synthesize extra weights.
 */
export function sansTextStyle(
  weight?: TextStyle['fontWeight'],
): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return {
    fontFamily: sansFamilyForWeight(weight),
    fontWeight: 'normal',
  };
}

/** System monospace for MRZ preview lines (fixed character width). */
export const fontMrz = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;

export function mrzTextStyle(): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return {
    fontFamily: fontMrz,
    fontWeight: 'normal',
  };
}

function weightToNumber(weight?: TextStyle['fontWeight']): number {
  if (weight === undefined || weight === 'normal') {
    return 400;
  }
  if (weight === 'bold') {
    return 700;
  }
  if (typeof weight === 'number') {
    return weight;
  }
  const parsed = Number.parseInt(weight, 10);
  return Number.isFinite(parsed) ? parsed : 400;
}
