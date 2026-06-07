// Polyfills must be imported first
import 'react-native-get-random-values';

import {markStartup} from './src/startup/startupTiming';

markStartup('appModule');

import React, {Suspense, useEffect, useLayoutEffect, useState, useRef} from 'react';
import {
  StatusBar,
  StyleSheet,
  BackHandler,
  Platform,
  AppState,
  Linking,
} from 'react-native';
import {NavigationContainer, DefaultTheme, type Theme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Buffer} from 'buffer';

import RNBootSplash from 'react-native-bootsplash';

import {markSplashHideCalled} from './src/startup/splashHideGate';

import {colors} from './src/components/common/styles';
import {AlertDialogProvider} from './src/components/common/AlertDialogProvider';
import {alertIcons, showSimpleAlert} from './src/components/common/alertHelpers';

import './src/startup/startStoredIdPreload';

import {MainNavigator} from './src/navigation/MainNavigator';
import type {RootStackParamList} from './src/navigation/types';
import {rootNavigationRef, navigateToVerificationRequest} from './src/navigation/rootNavigation';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer as any;
}

/** Start keystore read in startStoredIdPreload (before MainNavigator import). */

const VerificationNavigator = React.lazy(() =>
  import('./src/navigation/VerificationNavigator').then(m => ({
    default: m.VerificationNavigator,
  })),
);

const RootStack = createNativeStackNavigator<RootStackParamList>();

const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

function RootNavigator() {
  return (
    <Suspense fallback={null}>
      <RootStack.Navigator
        screenOptions={{headerShown: false}}
        initialRouteName="Main">
        <RootStack.Screen name="Main" component={MainNavigator} />
        <RootStack.Screen
          name="Verification"
          component={VerificationNavigator}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </RootStack.Navigator>
    </Suspense>
  );
}

function AppContent() {
  const [navigationReady, setNavigationReady] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const handledUrlRef = useRef<string | null>(null);
  const isProcessingUrlRef = useRef(false);
  const splashHiddenRef = useRef(false);

  useLayoutEffect(() => {
    markStartup('firstRender');
  }, []);

  useEffect(() => {
    if (!navigationReady || splashHiddenRef.current) {
      return;
    }

    let cancelled = false;

    requestAnimationFrame(() => {
      if (cancelled || splashHiddenRef.current) {
        return;
      }
      splashHiddenRef.current = true;
      markStartup('splashHideCalled');
      markSplashHideCalled();
      RNBootSplash.hide()
        .catch(() => {})
        .finally(() => markStartup('splashHidden'));
    });

    return () => {
      cancelled = true;
    };
  }, [navigationReady]);

  useEffect(() => {
    let mounted = true;

    const readIntentUrlIfNew = () => {
      Linking.getInitialURL()
        .then(url => {
          if (!mounted) {
            return;
          }
          const normalized = url?.trim();
          if (!normalized || normalized === handledUrlRef.current) {
            return;
          }
          setPendingUrl(normalized);
        })
        .catch(() => {});
    };

    readIntentUrlIfNew();

    const linkingSubscription = Linking.addEventListener('url', event => {
      const normalized = event.url?.trim();
      if (!normalized) {
        return;
      }
      // Browser opened the link again (same or new session).
      handledUrlRef.current = null;
      setPendingUrl(normalized);
    });

    // singleTask + warm start: onNewIntent updates the activity intent but may not
    // emit Linking 'url'; re-read getInitialURL when the app returns to foreground.
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        readIntentUrlIfNew();
      }
    });

    return () => {
      mounted = false;
      linkingSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!navigationReady || !pendingUrl || isProcessingUrlRef.current) {
      return;
    }

    const normalizedUrl = pendingUrl.trim();
    if (!normalizedUrl) {
      setPendingUrl(null);
      return;
    }

    if (handledUrlRef.current === normalizedUrl) {
      setPendingUrl(null);
      return;
    }

    isProcessingUrlRef.current = true;
    import('./src/utils/requestLinks')
      .then(({resolveSessionRequestPayload}) =>
        resolveSessionRequestPayload(normalizedUrl),
      )
      .then(payload => {
        handledUrlRef.current = normalizedUrl;
        navigateToVerificationRequest(payload);
      })
      .catch((error: any) => {
        showSimpleAlert({
          title: 'Invalid link',
          message:
            error?.message || "This link isn't a valid verification request.",
          icon: alertIcons.link,
        });
      })
      .finally(() => {
        isProcessingUrlRef.current = false;
        setPendingUrl(current => (current === normalizedUrl ? null : current));
      });
  }, [navigationReady, pendingUrl]);

  // Handle Android back button
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    let lastBackPress = 0;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (rootNavigationRef.isReady() && rootNavigationRef.canGoBack()) {
          rootNavigationRef.goBack();
          return true;
        }

        // At the root screen: require two quick back presses to exit
        const now = Date.now();
        if (now - lastBackPress < 2000) {
          return false; // second press within 2 s — exit
        }
        lastBackPress = now;
        return true; // swallow the first press
      },
    );

    return () => backHandler.remove();
  }, []);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer
        ref={rootNavigationRef}
        theme={navigationTheme}
        onReady={() => {
          markStartup('navigationReady');
          setNavigationReady(true);
        }}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AlertDialogProvider>
          <AppContent />
        </AlertDialogProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
