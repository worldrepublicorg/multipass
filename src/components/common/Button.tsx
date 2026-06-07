import React, {useCallback, useRef} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Platform,
  Pressable,
  Animated,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {sansTextStyle} from '../../theme/fonts';
import {CaretLeftIcon, XIcon} from 'phosphor-react-native';
import {
  colors,
  borderRadius as br,
  SCREEN_BACK_BUTTON_SIZE,
  screenBackIcon,
} from './styles';

const BUTTON_PRESS_SCALE = 0.99;

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  /** Omit default top margin (e.g. fixed footers). */
  embedded?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
  embedded = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = useCallback(
    (toValue: number, bounciness: number) => {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        speed: toValue < 1 ? 48 : 22,
        bounciness,
      }).start();
    },
    [scale],
  );

  const handlePressIn = useCallback(() => {
    if (!isDisabled) {
      springTo(BUTTON_PRESS_SCALE, 0);
    }
  }, [isDisabled, springTo]);

  const handlePressOut = useCallback(() => {
    if (!isDisabled) {
      springTo(1, 4);
    }
  }, [isDisabled, springTo]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={!fullWidth ? styles.inline : styles.fullWidth}>
      <Animated.View
        style={[
          styles.base,
          styles[variant],
          isDisabled && styles.disabled,
          embedded && styles.embedded,
          {transform: [{scale}]},
        ]}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              variant === 'primary' || variant === 'danger'
                ? colors.textOnDark
                : colors.primary
            }
          />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text
              style={[
                styles.text,
                styles[`${variant}Text`],
                isDisabled && styles.disabledText,
              ]}>
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export function BackButton({onPress}: {onPress: () => void}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{top: 8, bottom: 8, right: 8}}
      style={styles.toolbarIconButton}
      accessibilityRole="button"
      accessibilityLabel="Back">
      <CaretLeftIcon
        size={screenBackIcon.size}
        color={screenBackIcon.color}
        weight={screenBackIcon.weight}
      />
    </TouchableOpacity>
  );
}

export function CloseButton({
  onPress,
  style,
  accessibilityLabel = 'Close',
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
      style={[styles.toolbarIconButton, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}>
      <XIcon
        size={screenBackIcon.size}
        color={screenBackIcon.color}
        weight={screenBackIcon.weight}
      />
    </TouchableOpacity>
  );
}

const BUTTON_LG_HEIGHT = 56;
const BUTTON_LG_PADDING_H = 16;
/** Matches IDCard void — darker than shared colors.primary. */
const PRIMARY_BUTTON_BG = '#050505';

const styles = StyleSheet.create({
  base: {
    borderRadius: br.full,
    minHeight: BUTTON_LG_HEIGHT,
    minWidth: BUTTON_LG_HEIGHT,
    paddingHorizontal: BUTTON_LG_PADDING_H,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  inline: {
    alignSelf: 'flex-start',
  },
  embedded: {
    marginTop: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    ...sansTextStyle('600'),
    fontSize: 16,
    lineHeight: 19.2,
    ...(Platform.OS === 'android' ? {includeFontPadding: false} : {}),
  },
  primary: {
    backgroundColor: PRIMARY_BUTTON_BG,
  },
  primaryText: {
    color: colors.textOnDark,
  },
  secondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
  },
  tertiary: {
    backgroundColor: colors.surface,
  },
  tertiaryText: {
    color: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.textMuted,
  },
  danger: {
    backgroundColor: colors.error,
  },
  dangerText: {
    color: colors.textOnDark,
  },
  disabled: {
    opacity: 0.52,
  },
  disabledText: {
    color: colors.textMuted,
  },
  toolbarIconButton: {
    width: SCREEN_BACK_BUTTON_SIZE,
    height: SCREEN_BACK_BUTTON_SIZE,
    borderRadius: SCREEN_BACK_BUTTON_SIZE / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
