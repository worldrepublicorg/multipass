import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Animated, View, Text, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AnimatedSuccessCheck, Button} from '../../components/common';
import {colors} from '../../components/common/styles';
import {
  footerScrollClearance,
  useFooterLayout,
} from '../../hooks/useFooterBottomInset';
import {useReduceMotion} from '../../hooks/useReduceMotion';
import {verificationStatusStyles} from './verificationStatusStyles';
import type {RootStackParamList} from '../../navigation/types';

type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function VerificationSuccessScreen() {
  const rootNavigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [contentVisible, setContentVisible] = useState(reduceMotion);
  const contentOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const {footerBottom} = useFooterLayout({footerButtonCount: 1});

  const handleIconAnimationComplete = useCallback(() => {
    setContentVisible(true);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setContentVisible(true);
    }
  }, [reduceMotion]);

  useEffect(() => {
    if (!contentVisible) {
      contentOpacity.setValue(0);
      return;
    }
    if (reduceMotion) {
      contentOpacity.setValue(1);
      return;
    }
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [contentVisible, contentOpacity, reduceMotion]);

  const handleClose = () => {
    rootNavigation.reset({
      index: 0,
      routes: [{name: 'Main', params: {screen: 'ID'}}],
    });
  };

  return (
    <View
      style={[
        styles.screen,
        {paddingTop: insets.top, paddingBottom: insets.bottom},
      ]}>
      <View
        style={[
          styles.main,
          {
            paddingBottom:
              footerBottom + footerScrollClearance(1),
          },
        ]}>
        <View style={verificationStatusStyles.statusLayout}>
          <AnimatedSuccessCheck
            onAnimationComplete={handleIconAnimationComplete}
          />

          <View style={verificationStatusStyles.statusBody}>
            <Animated.View
              style={[
                verificationStatusStyles.statusBodyInner,
                {opacity: contentOpacity},
              ]}
              accessibilityElementsHidden={!contentVisible}
              importantForAccessibility={
                contentVisible ? 'auto' : 'no-hide-descendants'
              }>
              <Text style={verificationStatusStyles.statusTitle}>Verified</Text>
              <Text style={verificationStatusStyles.statusDetail}>
                Your verification was accepted
              </Text>
            </Animated.View>
          </View>
        </View>
      </View>

      <View style={[styles.footer, {bottom: footerBottom}]}>
        <Button label="Close" onPress={handleClose} embedded fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
});
