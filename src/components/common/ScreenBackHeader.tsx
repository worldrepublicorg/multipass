import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {BackButton, CloseButton} from './Button';
import {colors, SCREEN_BACK_TOOLBAR_PADDING_H} from './styles';

/** Top app bar height (logo and back-arrow toolbars). */
export const SCREEN_BACK_TOOLBAR_HEIGHT = 64;

interface ScreenBackHeaderProps {
  onPress: () => void;
  variant?: 'back' | 'close';
}

/**
 * Fixed back control at the top of the screen (does not scroll).
 * Uses absolute positioning so the arrow sits flush under the status bar.
 */
export function ScreenBackHeader({
  onPress,
  variant = 'back',
}: ScreenBackHeaderProps) {
  const insets = useSafeAreaInsets();
  const top = insets.top;

  return (
    <>
      <View style={{height: top + SCREEN_BACK_TOOLBAR_HEIGHT}} />
      <View style={[styles.toolbar, {top, height: SCREEN_BACK_TOOLBAR_HEIGHT}]}>
        {variant === 'close' ? (
          <CloseButton onPress={onPress} />
        ) : (
          <BackButton onPress={onPress} />
        )}
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
    paddingHorizontal: SCREEN_BACK_TOOLBAR_PADDING_H,
    zIndex: 10,
    backgroundColor: colors.background,
  },
});
