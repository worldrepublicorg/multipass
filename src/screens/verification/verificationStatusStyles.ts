import {StyleSheet} from 'react-native';

import {colors, typography} from '../../components/common/styles';
import {sansTextStyle} from '../../theme/fonts';

/** Shared hero status layout for verification flow screens (VerificationProgress, ServerCheck). */
export const verificationStatusStyles = StyleSheet.create({
  statusLayout: {
    width: '100%',
    alignItems: 'center',
  },
  statusBody: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  statusBodyInner: {
    width: '100%',
    alignItems: 'center',
  },
  statusTitle: {
    ...sansTextStyle('600'),
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'center',
  },
  statusDetail: {
    ...typography.subtitle,
    marginTop: 12,
    textAlign: 'center',
  },
  statusDetailError: {
    color: colors.error,
  },
  statusDetailWarning: {
    color: colors.textSecondary,
  },
  statusHint: {
    ...typography.subtitle,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
});
