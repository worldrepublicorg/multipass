import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet} from 'react-native';
import {
  CheckIcon,
  type Icon,
  type IconProps,
} from 'phosphor-react-native';
import {useReduceMotion} from '../../hooks/useReduceMotion';
import {colors} from './styles';

const BADGE_SIZE = 88;
const ICON_SIZE = 44;

export type StatusBadgeVariant = 'success' | 'error' | 'warning';

const VARIANT_STYLES: Record<
  StatusBadgeVariant,
  {backgroundColor: string; shadowColor: string}
> = {
  success: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
  },
  error: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
  },
  warning: {
    backgroundColor: colors.warning,
    shadowColor: colors.warning,
  },
};

export type AnimatedStatusBadgeProps = {
  variant: StatusBadgeVariant;
  icon?: Icon;
  iconProps?: Pick<IconProps, 'weight'>;
  /** Re-run entrance when this value changes. */
  playKey?: string;
  onAnimationComplete?: () => void;
};

export function AnimatedStatusBadge({
  variant,
  icon: IconComponent,
  iconProps,
  playKey = variant,
  onAnimationComplete,
}: AnimatedStatusBadgeProps) {
  const reduceMotion = useReduceMotion();
  const scaleAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const opacityAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const iconAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;
  const variantStyle = VARIANT_STYLES[variant];
  const ResolvedIcon = IconComponent ?? CheckIcon;

  useEffect(() => {
    if (reduceMotion) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
      iconAnim.setValue(1);
      onCompleteRef.current?.();
      return;
    }

    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    iconAnim.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(iconAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(({finished}) => {
      if (finished) {
        onCompleteRef.current?.();
      }
    });
  }, [scaleAnim, opacityAnim, iconAnim, reduceMotion, playKey]);

  return (
    <Animated.View
      style={[
        styles.badge,
        variantStyle,
        {
          opacity: opacityAnim,
          transform: [{scale: scaleAnim}],
        },
      ]}>
      <Animated.View style={{transform: [{scale: iconAnim}]}}>
        <ResolvedIcon
          size={ICON_SIZE}
          color={colors.textOnDark}
          weight={iconProps?.weight ?? 'bold'}
        />
      </Animated.View>
    </Animated.View>
  );
}

export type AnimatedSuccessCheckProps = {
  onAnimationComplete?: () => void;
  playKey?: string;
};

export function AnimatedSuccessCheck({
  onAnimationComplete,
  playKey = 'success',
}: AnimatedSuccessCheckProps) {
  return (
    <AnimatedStatusBadge
      variant="success"
      icon={CheckIcon}
      playKey={playKey}
      onAnimationComplete={onAnimationComplete}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
});
