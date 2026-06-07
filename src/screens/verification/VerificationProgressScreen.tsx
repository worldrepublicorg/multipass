import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, View, Text, StyleSheet, BackHandler, Platform} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ArrowsClockwiseIcon,
  CalendarXIcon,
  XCircleIcon,
  type Icon,
} from 'phosphor-react-native';
import {AnimatedStatusBadge, Button, CloseButton} from '../../components/common';
import {Spinner} from '../../components/common/Spinner';
import {
  colors,
} from '../../components/common/styles';
import {
  footerScrollClearance,
  useFooterLayout,
} from '../../hooks/useFooterBottomInset';
import type {StatusBadgeVariant} from '../../components/common';
import {verificationStatusStyles} from './verificationStatusStyles';
import {useReduceMotion} from '../../hooks/useReduceMotion';
import {getStoredID} from '../../storage/idStorage';
import {getDocumentLabel} from '../../components/IDCard';
import {
  generateSignatureId,
  resolveFailureReason,
  saveSignature,
} from '../../storage/historyStorage';
import {
  DuplicateSignatureError,
  getSessionId,
  getSubmitUrl,
  submitValidityOnServer,
} from '../../services/serverClient';
import {
  assertSubmitReady,
  deriveNullifier,
  duplicateSubmitMessage,
  expiredDocumentMessage,
  humanizeScope,
  isExpiredDocumentError,
  isSupportedSessionRequest,
  resolveScope,
  unsupportedSessionMessage,
} from '../../services/validity';
import {exitVerificationToIdHome} from '../../navigation/rootNavigation';
import type {VerificationStackParamList} from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<
  VerificationStackParamList,
  'VerificationProgress'
>;
type RouteType = RouteProp<VerificationStackParamList, 'VerificationProgress'>;

type SubmitStatus = 'submitting' | 'error';

type ErrorKind = 'generic' | 'duplicate' | 'expired' | 'unsupported';

type ErrorState = {
  kind: ErrorKind;
  title: string;
  detail: string;
};

function actionLabel(request: RouteType['params']['request']): string {
  if (request.service?.purpose?.trim()) {
    return request.service.purpose.trim();
  }
  const scope = request.service?.scope?.trim();
  return scope ? humanizeScope(scope) : 'Verification';
}

function getErrorBadgeConfig(kind: ErrorKind): {
  variant: StatusBadgeVariant;
  Icon: Icon;
} {
  switch (kind) {
    case 'duplicate':
      return {variant: 'warning', Icon: ArrowsClockwiseIcon};
    case 'expired':
      return {variant: 'warning', Icon: CalendarXIcon};
    default:
      return {variant: 'error', Icon: XCircleIcon};
  }
}

function getUserFriendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('connection')
  ) {
    return 'Network error. Check your connection and try again.';
  }
  if (lower.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  if (
    lower.includes('server') ||
    lower.includes('500') ||
    lower.includes('502')
  ) {
    return 'Server error. Please try again in a moment.';
  }
  if (lower.includes('certificate') || lower.includes('dsc')) {
    return 'This document could not be verified. It may not be supported yet.';
  }
  if (lower.includes('expired') || lower.includes('expiry')) {
    return expiredDocumentMessage().detail;
  }
  return 'Something went wrong. Please try again.';
}

export function VerificationProgressScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const {request} = route.params;

  const [status, setStatus] = useState<SubmitStatus>('submitting');
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [errorContentVisible, setErrorContentVisible] = useState(reduceMotion);

  const submitStarted = useRef(false);
  const leavingScreenRef = useRef(false);
  const errorTextOpacity = useRef(new Animated.Value(0)).current;

  const showRetryFooter =
    errorState?.kind === 'generic' || errorState?.kind === 'unsupported';
  const footerButtonCount = showRetryFooter ? 2 : 1;
  const {footerBottom} = useFooterLayout({footerButtonCount});

  const errorBadge = useMemo(
    () => (errorState ? getErrorBadgeConfig(errorState.kind) : null),
    [errorState],
  );

  const exitToIdHome = useCallback(() => {
    leavingScreenRef.current = true;
    exitVerificationToIdHome();
  }, []);

  const handleCancel = useCallback(() => {
    exitToIdHome();
  }, [exitToIdHome]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (leavingScreenRef.current) {
        return;
      }
      const actionType = event.data.action.type;
      if (actionType === 'REPLACE' || actionType === 'RESET') {
        return;
      }
      if (actionType === 'GO_BACK' || actionType === 'POP') {
        event.preventDefault();
        exitToIdHome();
      }
    });
    return unsubscribe;
  }, [navigation, exitToIdHome]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        exitToIdHome();
        return true;
      },
    );

    return () => subscription.remove();
  }, [exitToIdHome]);

  const runSubmit = useCallback(async () => {
    const startedAt = Date.now();

    if (!isSupportedSessionRequest(request)) {
      const unsupported = unsupportedSessionMessage();
      setErrorState({
        kind: 'unsupported',
        title: unsupported.title,
        detail: unsupported.detail,
      });
      setStatus('error');
      return;
    }

    const storedId = await getStoredID();
    if (!storedId) {
      setErrorState({
        kind: 'generic',
        title: 'No ID on this device',
        detail: 'Add your ID in the app before you can continue',
      });
      setStatus('error');
      return;
    }

    const sessionId = getSessionId(request);

    try {
      assertSubmitReady(storedId, request);
      const scope = resolveScope(request);
      const nullifier = deriveNullifier(scope, storedId.sod);

      const result = await submitValidityOnServer(getSubmitUrl(request), {
        nullifier,
        scope,
        request: sessionId ? {sessionId} : undefined,
      });

      const elapsed = Date.now() - startedAt;

      await saveSignature({
        id: generateSignatureId(),
        timestamp: Date.now(),
        serviceName: request.service?.name || 'Verification',
        serviceUrl: getSubmitUrl(request),
        sessionId,
        purpose: request.service?.purpose,
        success: true,
        nullifier: result.nullifier ?? nullifier,
        durationMs: elapsed,
        usedIdRef: storedId.id,
        usedIdLabel: `${storedId.issuingCountry} ${getDocumentLabel(storedId.mrzDocCode)}`,
      });

      navigation.replace('VerificationSuccess', {request, durationMs: elapsed});
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Verification failed';
      const isDuplicate =
        err instanceof DuplicateSignatureError ||
        message.toLowerCase().includes('already exists') ||
        message.toLowerCase().includes('duplicate');
      const isExpired = isExpiredDocumentError(err);
      const elapsed = Date.now() - startedAt;

      if (isDuplicate) {
        const scope = isSupportedSessionRequest(request)
          ? resolveScope(request)
          : '';
        const dupCopy = scope
          ? duplicateSubmitMessage(scope)
          : {
              title: 'Already used',
              detail: 'This document was already used for this action',
            };
        setErrorState({
          kind: 'duplicate',
          title: dupCopy.title,
          detail: dupCopy.detail,
        });
      } else if (isExpired) {
        const expiredCopy = expiredDocumentMessage();
        setErrorState({
          kind: 'expired',
          title: expiredCopy.title,
          detail: expiredCopy.detail,
        });
      } else {
        setErrorState({
          kind: 'generic',
          title: 'Verification failed',
          detail: getUserFriendlyError(message),
        });
      }

      setStatus('error');

      await saveSignature({
        id: generateSignatureId(),
        timestamp: Date.now(),
        serviceName: request.service?.name || 'Verification',
        serviceUrl: getSubmitUrl(request),
        sessionId,
        purpose: request.service?.purpose,
        success: false,
        failureReason: resolveFailureReason({isDuplicate, isExpired}),
        durationMs: elapsed,
        usedIdRef: storedId?.id ?? '',
        usedIdLabel: storedId
          ? `${storedId.issuingCountry} ${getDocumentLabel(storedId.mrzDocCode)}`
          : 'Unknown',
      });
    }
  }, [navigation, request]);

  useEffect(() => {
    if (!submitStarted.current) {
      submitStarted.current = true;
      runSubmit();
    }
  }, [runSubmit]);

  const handleRetry = useCallback(() => {
    setErrorState(null);
    setErrorContentVisible(reduceMotion);
    setStatus('submitting');
    submitStarted.current = false;
    runSubmit();
  }, [reduceMotion, runSubmit]);

  const handleErrorBadgeAnimationComplete = useCallback(() => {
    setErrorContentVisible(true);
  }, []);

  useEffect(() => {
    if (status === 'error') {
      setErrorContentVisible(reduceMotion);
    }
  }, [status, errorState?.kind, reduceMotion]);

  useEffect(() => {
    if (!errorContentVisible) {
      errorTextOpacity.setValue(0);
      return;
    }
    if (reduceMotion) {
      errorTextOpacity.setValue(1);
      return;
    }
    errorTextOpacity.setValue(0);
    Animated.timing(errorTextOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [errorContentVisible, errorState?.kind, errorTextOpacity, reduceMotion]);

  const label = actionLabel(request);
  const isWarningError =
    errorState?.kind === 'duplicate' || errorState?.kind === 'expired';

  return (
    <View
      style={[
        styles.screen,
        {paddingTop: insets.top, paddingBottom: insets.bottom},
      ]}>
      <CloseButton style={styles.closeButton} onPress={handleCancel} />

      <View
        style={[
          styles.main,
          (status === 'submitting' || status === 'error') && styles.mainCentered,
          status === 'error' && {
            paddingBottom: footerBottom + footerScrollClearance(footerButtonCount),
          },
        ]}>
        {status === 'submitting' && (
          <View style={verificationStatusStyles.statusLayout}>
            <Spinner size="large" />
            <View style={verificationStatusStyles.statusBody}>
              <Text style={verificationStatusStyles.statusTitle}>
                Submitting verification
              </Text>
              <Text style={verificationStatusStyles.statusDetail}>{label}</Text>
              <Text style={verificationStatusStyles.statusHint}>
                Keep the app open for a moment.
              </Text>
            </View>
          </View>
        )}

        {status === 'error' && errorState && errorBadge && (
          <View style={verificationStatusStyles.statusLayout}>
            <AnimatedStatusBadge
              variant={errorBadge.variant}
              icon={errorBadge.Icon}
              playKey={errorState.kind}
              onAnimationComplete={handleErrorBadgeAnimationComplete}
            />

            <View style={verificationStatusStyles.statusBody}>
              <Animated.View
                style={[verificationStatusStyles.statusBodyInner, {opacity: errorTextOpacity}]}
                accessibilityElementsHidden={!errorContentVisible}
                importantForAccessibility={
                  errorContentVisible ? 'auto' : 'no-hide-descendants'
                }>
                <Text style={verificationStatusStyles.statusTitle}>
                  {errorState.title}
                </Text>
                <Text
                  style={[
                    verificationStatusStyles.statusDetail,
                    verificationStatusStyles.statusDetailError,
                    isWarningError && verificationStatusStyles.statusDetailWarning,
                  ]}>
                  {errorState.detail}
                </Text>
              </Animated.View>
            </View>
          </View>
        )}
      </View>

      {status === 'error' && errorState ? (
        <View style={[styles.footer, {bottom: footerBottom}]}>
          {showRetryFooter ? (
            <>
              <Button
                label="Try again"
                onPress={handleRetry}
                embedded
                fullWidth
              />
              <Button
                label="Cancel"
                onPress={handleCancel}
                variant="tertiary"
                embedded
                fullWidth
              />
            </>
          ) : (
            <Button
              label="Go back"
              onPress={handleCancel}
              embedded
              fullWidth
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  mainCentered: {
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 20,
  },
});
