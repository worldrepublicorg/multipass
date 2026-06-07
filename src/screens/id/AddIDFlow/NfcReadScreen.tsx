import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  NativeEventEmitter,
  Animated,
  Platform,
  Linking,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {Icon} from 'phosphor-react-native';
import {
  CrosshairIcon,
  DeviceMobileIcon,
  HandPalmIcon,
  IdentificationCardIcon,
} from 'phosphor-react-native';
import {Button, ScreenBackHeader} from '../../../components/common';
import {Card} from '../../../components/common/Card';
import {
  colors,
  commonStyles,
  borderRadius,
  referendumEmptyState,
  spacing,
  typography,
} from '../../../components/common/styles';
import {sansTextStyle} from '../../../theme/fonts';
import {useFooterLayout} from '../../../hooks/useFooterBottomInset';
import {useID} from '../../../hooks/useID';
import {
  getNfcReader,
  isNfcReaderAvailable,
  type NfcProgressEvent,
} from '../../../native/nfcReader';
import type {IDStackParamList} from '../../../navigation/types';

const ICON_HERO_PHONE = 62;
const PHONE_GLYPH_WIDTH = (ICON_HERO_PHONE * 144) / 256;
const PHONE_GLYPH_HEIGHT = (ICON_HERO_PHONE * 224) / 256;
const PHONE_BG_RADIUS = (ICON_HERO_PHONE * 24) / 256;
const ICON_HERO_CARD = 62;
const ICON_HERO_CARD_SLOT = 67;
const NFC_RING_SIZE = 115;
const NFC_RING_SCALE_MIN = 0.75;
const NFC_RING_SCALE_MAX = 1.1;
const NFC_RING_OPACITY_START = 0.5;
const NFC_RING_OPACITY_END = 0;
const NFC_HERO_DOWN_OFFSET = 12;
const NFC_PROGRESS_COMPLETE = 95;
function nfcIdDocTop(animationHeight: number): number {
  const phoneCenterY = animationHeight / 2;
  const phoneTop = phoneCenterY - ICON_HERO_PHONE / 2;
  return phoneTop - ICON_HERO_CARD_SLOT / 2;
}

let NFC_ANIMATION_HEIGHT = 96;
let NFC_DOC_TOP = nfcIdDocTop(NFC_ANIMATION_HEIGHT);
if (NFC_DOC_TOP < 8) {
  NFC_ANIMATION_HEIGHT += 8 - NFC_DOC_TOP;
  NFC_DOC_TOP = nfcIdDocTop(NFC_ANIMATION_HEIGHT);
}

type NavigationProp = NativeStackNavigationProp<IDStackParamList, 'AddIDNfc'>;
type RouteType = RouteProp<IDStackParamList, 'AddIDNfc'>;

const READING_TIPS: {text: string; Icon: Icon}[] = [
  {text: 'Remove your phone case for better contact', Icon: DeviceMobileIcon},
  {text: 'The NFC reader is usually near the camera', Icon: CrosshairIcon},
  {text: 'Hold completely still until complete', Icon: HandPalmIcon},
];

type NfcErrorDisplay = {
  title: string;
  message: string;
  showNfcSettings: boolean;
};

function mapNfcError(message: string): NfcErrorDisplay {
  const lower = message.toLowerCase();

  if (lower.includes('nfc') && lower.includes('disabled')) {
    return {
      title: 'NFC is turned off',
      message: 'Turn on NFC in settings, then try again.',
      showNfcSettings: true,
    };
  }

  if (
    lower.includes('not available') ||
    lower.includes('module not available')
  ) {
    return {
      title: 'NFC not available',
      message: "This device can't read document chips.",
      showNfcSettings: false,
    };
  }

  const authRelated =
    lower.includes('authentication') ||
    lower.includes('bac failed') ||
    lower.includes('mutual auth') ||
    lower.includes('pace') ||
    lower.includes('mrz') ||
    lower.includes('verify the mrz') ||
    lower.includes('key not found') ||
    lower.includes('wrong data');

  if (authRelated) {
    return {
      title: "Couldn't read chip",
      message:
        'Check the document number and dates from the previous step, then try again.',
      showNfcSettings: false,
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      title: 'Read timed out',
      message: 'Hold your phone steady on the chip and try again.',
      showNfcSettings: false,
    };
  }

  if (
    lower.includes('certificate') ||
    lower.includes('dsc') ||
    lower.includes('registry') ||
    lower.includes('verify')
  ) {
    return {
      title: "Couldn't verify document",
      message: 'This document may not be supported yet.',
      showNfcSettings: false,
    };
  }

  return {
    title: 'Read failed',
    message: 'Keep your phone on the chip and try again.',
    showNfcSettings: false,
  };
}

export function NfcReadScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const {addID} = useID();

  const [status, setStatus] = useState('Preparing NFC reader...');
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<NfcErrorDisplay | null>(null);
  const scanAttemptRef = useRef(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(NFC_RING_SCALE_MIN)).current;
  const ringOpacity = ringAnim.interpolate({
    inputRange: [NFC_RING_SCALE_MIN, NFC_RING_SCALE_MAX],
    outputRange: [NFC_RING_OPACITY_START, NFC_RING_OPACITY_END],
    extrapolate: 'clamp',
  });
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {documentNumber, dateOfBirth, dateOfExpiry} = route.params;
  const {footerBottom, scrollPaddingBottom} = useFooterLayout({
    footerButtonCount: 1,
  });

  useEffect(() => {
    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: NFC_RING_SCALE_MAX,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: NFC_RING_SCALE_MIN,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    ring.start();

    return () => {
      ring.stop();
    };
  }, [ringAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }
    if (!isNfcReaderAvailable()) {
      return;
    }

    const eventEmitter = new NativeEventEmitter(getNfcReader());
    const subscription = eventEmitter.addListener(
      'NfcProgress',
      (event: NfcProgressEvent) => {
        console.log('[NFC Progress]', event);
        setProgress(Math.min(event.percent, NFC_PROGRESS_COMPLETE));
        setStatus(event.message);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const cancelCurrentScan = useCallback(async () => {
    if (!isNfcReaderAvailable()) {
      return;
    }

    try {
      await getNfcReader().cancelCurrentScan();
    } catch {}
  }, []);

  const startScan = useCallback(async () => {
    if (!isNfcReaderAvailable()) {
      setError(mapNfcError('NFC module not available on this device'));
      return;
    }

    const attempt = scanAttemptRef.current + 1;
    scanAttemptRef.current = attempt;
    setScanning(true);
    setError(null);
    setProgress(0);
    setStatus('Hold your phone against the NFC chip...');

    try {
      const result = await getNfcReader().scan({
        documentNumber,
        dateOfBirth,
        dateOfExpiry,
      });

      if (scanAttemptRef.current !== attempt) {
        return;
      }

      setStatus('Verifying document against registry...');
      setProgress(NFC_PROGRESS_COMPLETE);
      const newId = await addID(result.dg1, result.sod);

      navigation.navigate('AddIDSuccess', {id: newId.id});
    } catch (err: any) {
      if (scanAttemptRef.current !== attempt) {
        return;
      }

      const message = err?.message || '';
      const code = String(err?.code || '');

      if (code.includes('CANCELLED') || message === 'Scan cancelled') {
        setScanning(false);
        return;
      }

      setError(mapNfcError(message));
      setScanning(false);
      setProgress(0);
    }
  }, [documentNumber, dateOfBirth, dateOfExpiry, addID, navigation]);

  useEffect(() => {
    startScan();
    return () => {
      scanAttemptRef.current += 1;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      cancelCurrentScan();
    };
  }, [cancelCurrentScan, startScan]);

  const retryScan = useCallback(async () => {
    scanAttemptRef.current += 1;
    setScanning(false);
    setError(null);
    setStatus('Restarting NFC reader...');
    setProgress(0);

    await cancelCurrentScan();

    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      startScan();
    }, 300);
  }, [cancelCurrentScan, startScan]);

  const openNfcSettings = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.NFC_SETTINGS').catch(() => {
        Linking.openSettings();
      });
    } else {
      Linking.openURL('App-Prefs:root=General');
    }
  }, []);

  const handleCancel = useCallback(() => {
    scanAttemptRef.current += 1;
    setScanning(false);
    cancelCurrentScan();
    navigation.goBack();
  }, [cancelCurrentScan, navigation]);

  const showCancelFooter = scanning && !error;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={commonStyles.screen}>
      <ScreenBackHeader onPress={() => navigation.goBack()} />
      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={[
          commonStyles.screenBody,
          showCancelFooter && {paddingBottom: scrollPaddingBottom},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Read NFC chip</Text>
          <Text style={commonStyles.pageSubtitle}>
            Keep your phone steady on the document
          </Text>
        </View>

        <View style={commonStyles.flowStepsGap}>
          <Card>
            <View style={styles.nfcAnimation}>
              <View style={styles.nfcHero}>
                <View style={styles.nfcDoc}>
                  <IdentificationCardIcon
                    size={ICON_HERO_CARD}
                    weight="regular"
                    color={colors.primary}
                  />
                </View>
                <View style={styles.nfcHeroCluster}>
                  <Animated.View
                    style={[
                      styles.nfcRing,
                      {
                        transform: [{scale: ringAnim}],
                        opacity: scanning ? ringOpacity : 0,
                      },
                    ]}
                  />
                  <View style={styles.nfcPhone}>
                    <View style={styles.nfcPhoneIconBg} />
                    <View style={styles.nfcPhoneIconOverlay}>
                      <DeviceMobileIcon
                        size={ICON_HERO_PHONE}
                        weight="regular"
                        color={colors.primary}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[styles.progressFill, {width: progressWidth}]}
                />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>

            <Text style={styles.statusText}>{status}</Text>
          </Card>

          {error ? (
            <Card title={error.title}>
              <Text style={styles.errorMessage}>{error.message}</Text>
              <Button label="Try again" onPress={retryScan} />
              {error.showNfcSettings ? (
                <Button
                  label="Open NFC settings"
                  onPress={openNfcSettings}
                  variant="secondary"
                />
              ) : (
                <Button
                  label="Enter MRZ manually"
                  onPress={() => navigation.goBack()}
                  variant="secondary"
                />
              )}
            </Card>
          ) : null}

          <Card style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for successful reading:</Text>
            <View style={styles.tipsList}>
              {READING_TIPS.map(({text, Icon: TipIcon}) => (
                <View key={text} style={styles.tipRow}>
                  <View
                    style={[
                      referendumEmptyState.featureIconCircle,
                      styles.tipIconCircle,
                    ]}>
                    <TipIcon
                      size={14}
                      color={colors.textMuted}
                      weight="fill"
                    />
                  </View>
                  <Text style={styles.tipText}>{text}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>

      {showCancelFooter ? (
        <View style={[commonStyles.footerActions, {bottom: footerBottom}]}>
          <Button
            label="Cancel"
            onPress={handleCancel}
            variant="tertiary"
            embedded
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  nfcAnimation: {
    width: '100%',
    height: NFC_ANIMATION_HEIGHT,
    marginBottom: 16,
  },
  nfcHero: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcHeroCluster: {
    width: NFC_RING_SIZE,
    height: NFC_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: NFC_HERO_DOWN_OFFSET,
  },
  nfcRing: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
    width: NFC_RING_SIZE,
    height: NFC_RING_SIZE,
    borderRadius: NFC_RING_SIZE / 2,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  nfcPhone: {
    zIndex: 2,
    width: ICON_HERO_PHONE,
    height: ICON_HERO_PHONE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcPhoneIconBg: {
    width: PHONE_GLYPH_WIDTH,
    height: PHONE_GLYPH_HEIGHT,
    borderRadius: PHONE_BG_RADIUS,
    backgroundColor: colors.background,
  },
  nfcPhoneIconOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcDoc: {
    position: 'absolute',
    top: NFC_DOC_TOP + NFC_HERO_DOWN_OFFSET,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    ...sansTextStyle('600'),
    fontSize: 14,
    color: colors.primary,
    width: 40,
    textAlign: 'right',
  },
  statusText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    ...typography.body3,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  tips: {
    marginTop: 16,
    marginBottom: 0,
  },
  tipsTitle: {
    ...sansTextStyle('600'),
    fontSize: 14,
    color: colors.primary,
    marginBottom: 14,
  },
  tipsList: {
    gap: spacing.md,
  },
  tipIconCircle: {
    backgroundColor: colors.background,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    ...typography.body3,
    color: colors.textSecondary,
    flex: 1,
  },
});
