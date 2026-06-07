import React, {useCallback, useEffect, useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation, CommonActions} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AnimatedSuccessCheck} from '../../../components/common';
import {colors} from '../../../components/common/styles';
import {useReduceMotion} from '../../../hooks/useReduceMotion';
import type {IDStackParamList} from '../../../navigation/types';

type NavigationProp = NativeStackNavigationProp<
  IDStackParamList,
  'AddIDSuccess'
>;

/** Brief hold after animation (matches ServerCheckScreen). */
const SUCCESS_DWELL_MS = 500;

export function AddIDSuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToIDHome = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: 'IDHome'}],
      }),
    );
  }, [navigation]);

  const handleAnimationComplete = useCallback(() => {
    const dwellMs = reduceMotion ? 0 : SUCCESS_DWELL_MS;
    navigateTimeoutRef.current = setTimeout(goToIDHome, dwellMs);
  }, [goToIDHome, reduceMotion]);

  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) {
        clearTimeout(navigateTimeoutRef.current);
        navigateTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top, paddingBottom: insets.bottom},
      ]}>
      <AnimatedSuccessCheck onAnimationComplete={handleAnimationComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
