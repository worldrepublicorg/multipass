import React, {useEffect, useRef} from 'react';
import {Animated, View, type StyleProp, type ViewStyle} from 'react-native';
import {useReduceMotion} from '../../hooks/useReduceMotion';

export type FadeInMotion = 'fade' | 'fade-up';

export type FadeInContentProps = {
  children: React.ReactNode;
  /** Re-run entrance when this value changes (e.g. empty vs with-id). */
  playKey: string;
  /** `fade` — opacity only (better for large dark surfaces). `fade-up` — opacity + slide. */
  motion?: FadeInMotion;
  delayMs?: number;
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
};

export function FadeInContent({
  children,
  playKey,
  motion = 'fade-up',
  delayMs = 0,
  durationMs = 500,
  style,
}: FadeInContentProps) {
  const reduceMotion = useReduceMotion();
  const slide = motion === 'fade-up';
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const translateY = useRef(
    new Animated.Value(reduceMotion || !slide ? 0 : 14),
  ).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    opacity.setValue(0);
    translateY.setValue(slide ? 14 : 0);

    function runAnimation() {
      const animations: Animated.CompositeAnimation[] = [
        Animated.timing(opacity, {
          toValue: 1,
          duration: durationMs,
          useNativeDriver: true,
        }),
      ];
      if (slide) {
        animations.push(
          Animated.spring(translateY, {
            toValue: 0,
            tension: 60,
            friction: 10,
            useNativeDriver: true,
          }),
        );
      }
      Animated.parallel(animations).start();
    }

    const timeout = delayMs > 0 ? setTimeout(runAnimation, delayMs) : undefined;
    if (!timeout) {
      runAnimation();
    }

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [playKey, delayMs, durationMs, motion, slide, opacity, translateY, reduceMotion]);

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: slide ? [{translateY}] : undefined,
        },
      ]}>
      {children}
    </Animated.View>
  );
}
