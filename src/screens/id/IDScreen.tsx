import React, {useCallback, useEffect, useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useID} from '../../hooks/useID';
import {getStoredIdCache} from '../../hooks/idState';
import {waitForSplashHideCalled} from '../../startup/splashHideGate';
import {colors} from '../../components/common/styles';
import {IDEmptyHome} from './IDEmptyHome';
import {IDStoredHome} from './IDStoredHome';

export function IDScreen() {
  const {id, loading, refreshing, refresh, hasID} = useID();
  const prefetchVariantRef = useRef<'empty' | 'stored' | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!getStoredIdCache().loaded) {
        return;
      }
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (loading && !hasID) {
      return;
    }

    const variant = hasID ? 'stored' : 'empty';
    if (prefetchVariantRef.current === variant) {
      return;
    }
    prefetchVariantRef.current = variant;

    let cancelled = false;
    let deferredHandle: ReturnType<typeof setImmediate> | undefined;

    void waitForSplashHideCalled().then(() => {
      if (cancelled) {
        return;
      }
      deferredHandle = setImmediate(() => {
        if (cancelled) {
          return;
        }
        void import('../../startup/prefetchAfterHome').then(m =>
          m.prefetchAfterHome(hasID),
        );
      });
    });

    return () => {
      cancelled = true;
      if (deferredHandle != null) {
        clearImmediate(deferredHandle);
      }
    };
  }, [loading, hasID]);

  if (loading && !getStoredIdCache().loaded) {
    return <View style={styles.bootShell} />;
  }

  if (hasID && id) {
    return (
      <IDStoredHome
        id={id}
        refreshing={refreshing}
        onRefresh={refresh}
      />
    );
  }

  return (
    <IDEmptyHome
      loading={loading}
      refreshing={refreshing}
      onRefresh={refresh}
    />
  );
}

const styles = StyleSheet.create({
  bootShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
