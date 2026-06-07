import React, {useCallback} from 'react';
import {View, Image, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {SCREEN_BACK_TOOLBAR_HEIGHT} from './ScreenBackHeader';
import {colors, APP_HEADER_PADDING_H} from './styles';
import type {MainParamList} from '../../navigation/types';

const APP_LOGO = require('../../../assets/logo.png');
const LOGO_HEIGHT = 42;
const logoAsset = Image.resolveAssetSource(APP_LOGO);
const LOGO_WIDTH =
  logoAsset.width && logoAsset.height
    ? (LOGO_HEIGHT * logoAsset.width) / logoAsset.height
    : LOGO_HEIGHT;

function OptionsMenuIcon() {
  return (
    <View style={styles.optionsIcon}>
      <View style={styles.optionsDot} />
      <View style={styles.optionsDot} />
      <View style={styles.optionsDot} />
    </View>
  );
}

/** Fixed logo bar for the ID screen — same height as ScreenBackHeader, no shadow. */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainParamList>>();

  const handleMenuPress = useCallback(() => {
    const mainNavigation =
      navigation.getParent<NativeStackNavigationProp<MainParamList>>();
    mainNavigation?.navigate('Menu', {screen: 'MenuHome'});
  }, [navigation]);

  return (
    <>
      <View style={{height: insets.top + SCREEN_BACK_TOOLBAR_HEIGHT}} />
      <View
        style={[
          styles.toolbar,
          {top: insets.top, height: SCREEN_BACK_TOOLBAR_HEIGHT},
        ]}>
        <Image
          source={APP_LOGO}
          style={[styles.logo, {width: LOGO_WIDTH, height: LOGO_HEIGHT}]}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMenuPress}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
          accessibilityLabel="Menu"
          accessibilityRole="button">
          <OptionsMenuIcon />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: APP_HEADER_PADDING_H,
    zIndex: 10,
    backgroundColor: colors.background,
  },
  logo: {
    flexShrink: 0,
  },
  menuButton: {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  optionsIcon: {
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
});
