import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {XCircleIcon} from 'phosphor-react-native';
import {AnimatedStatusBadge, Button, CloseButton} from '../../components/common';
import {Spinner} from '../../components/common/Spinner';
import {commonStyles} from '../../components/common/styles';
import {pingServerHealth, getSubmitUrl} from '../../services/serverClient';
import {
  isSupportedSessionRequest,
  unsupportedSessionMessage,
} from '../../services/validity';
import {verificationStatusStyles} from './verificationStatusStyles';
import type {VerificationStackParamList} from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<
  VerificationStackParamList,
  'ServerCheck'
>;
type RouteType = RouteProp<VerificationStackParamList, 'ServerCheck'>;

export function ServerCheckScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const {request} = route.params;

  const [status, setStatus] = useState<'checking' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  const goToSessionDetails = useCallback(() => {
    navigation.replace('SessionDetails', {request});
  }, [navigation, request]);

  const checkServer = useCallback(async () => {
    setStatus('checking');
    setErrorMessage('');

    if (!isSupportedSessionRequest(request)) {
      const unsupported = unsupportedSessionMessage();
      setStatus('error');
      setErrorMessage(`${unsupported.title}. ${unsupported.detail}`);
      return;
    }

    try {
      await pingServerHealth(getSubmitUrl(request));
      goToSessionDetails();
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error?.message || 'Could not connect to the server');
    }
  }, [goToSessionDetails, request]);

  useEffect(() => {
    checkServer();
  }, [checkServer]);

  const handleCancel = () => {
    navigation.getParent()?.goBack();
  };

  return (
    <View style={[commonStyles.safeArea, styles.container]}>
      <CloseButton style={styles.closeButton} onPress={handleCancel} />

      <View style={styles.main}>
        {status === 'checking' && (
          <View style={verificationStatusStyles.statusLayout}>
            <Spinner size="large" />
            <View style={verificationStatusStyles.statusBody}>
              <Text style={verificationStatusStyles.statusTitle}>
                Connecting to server...
              </Text>
              <Text style={verificationStatusStyles.statusHint}>
                {getDomain(getSubmitUrl(request))}
              </Text>
            </View>
          </View>
        )}

        {status === 'error' && (
          <View style={verificationStatusStyles.statusLayout}>
            <AnimatedStatusBadge
              variant="error"
              icon={XCircleIcon}
              playKey={errorMessage}
            />
            <View style={verificationStatusStyles.statusBody}>
              <Text style={verificationStatusStyles.statusTitle}>
                Server unavailable
              </Text>
              <Text
                style={[
                  verificationStatusStyles.statusDetail,
                  verificationStatusStyles.statusDetailError,
                ]}>
                {errorMessage}
              </Text>
              <Text style={verificationStatusStyles.statusHint}>
                {getDomain(getSubmitUrl(request))}
              </Text>
              <View style={styles.buttons}>
                <Button label="Retry" onPress={checkServer} />
                <Button
                  label="Cancel"
                  onPress={handleCancel}
                  variant="tertiary"
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function getDomain(url: string): string {
  // Avoid URL object property access — throws "not implemented" in React Native.
  // Extract hostname with a simple string slice between "://" and the next "/".
  try {
    const start = url.indexOf('://');
    if (start < 0) {
      return url;
    }
    const hostStart = start + 3;
    const hostEnd = url.indexOf('/', hostStart);
    return hostEnd < 0 ? url.slice(hostStart) : url.slice(hostStart, hostEnd);
  } catch {
    return url;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  main: {
    alignItems: 'center',
    width: '100%',
  },
  buttons: {
    marginTop: 24,
    width: '100%',
  },
});
