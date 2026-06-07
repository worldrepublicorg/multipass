import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  type PanGestureActiveEvent,
  type PanGestureEvent,
} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button, CloseButton} from './Button';
import {colors, borderRadius, spacing, typography} from './styles';

const BACKDROP_OPACITY = 0.45;
const SHEET_SLIDE_OFFSET = Math.round(Dimensions.get('window').height * 0.4);
const ENTER_DURATION_MS = 280;
const EXIT_DURATION_MS = 220;
const FLICK_EXIT_DURATION_MS = 130;
const DIALOG_MARGIN = spacing.md;
const DIALOG_PADDING = 32;
const DIALOG_RADIUS = 28;
const HEADER_ICON_TITLE_GAP = spacing.xxl;
const TITLE_DESCRIPTION_GAP = spacing.lg;
const DESCRIPTION_FOOTER_GAP = 32;
const SWIPE_DISMISS_DRAG = 48;
const SWIPE_DISMISS_VELOCITY = 380;

export type AlertDialogButtonStyle = 'default' | 'cancel' | 'destructive';

export type AlertDialogButton = {
  text: string;
  style?: AlertDialogButtonStyle;
  onPress?: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
};

export type AlertDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: React.ReactNode;
  buttons?: AlertDialogButton[];
  onDismiss: () => void;
  onOpenChange?: (open: boolean) => void;
  contentStyle?: StyleProp<ViewStyle>;
};

function buttonVariant(
  style: AlertDialogButtonStyle | undefined,
): 'primary' | 'secondary' | 'tertiary' | 'danger' {
  switch (style) {
    case 'destructive':
      return 'danger';
    case 'cancel':
      return 'tertiary';
    default:
      return 'primary';
  }
}

export function AlertDialog({
  visible,
  title,
  message,
  icon,
  buttons,
  onDismiss,
  onOpenChange,
  contentStyle,
}: AlertDialogProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_SLIDE_OFFSET)).current;
  const dragOriginY = useRef(0);
  const exitDurationRef = useRef(EXIT_DURATION_MS);
  const isClosingRef = useRef(false);
  const isDraggingRef = useRef(false);

  const resolvedButtons = useMemo(
    () => buttons ?? [{text: 'OK'}],
    [buttons],
  );

  const actionButtons = useMemo(
    () => resolvedButtons.filter(button => button.style !== 'cancel'),
    [resolvedButtons],
  );

  const runExitAnimation = useCallback(
    (onComplete?: () => void) => {
      if (isClosingRef.current) {
        return;
      }
      isClosingRef.current = true;
      isDraggingRef.current = false;
      const duration = exitDurationRef.current;

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SHEET_SLIDE_OFFSET,
          duration,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({finished}) => {
        isClosingRef.current = false;
        exitDurationRef.current = EXIT_DURATION_MS;
        if (finished) {
          setMounted(false);
          onComplete?.();
          onDismiss();
        }
      });
    },
    [backdropOpacity, onDismiss, sheetTranslateY],
  );

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      isDraggingRef.current = false;
      dragOriginY.current = 0;
      exitDurationRef.current = EXIT_DURATION_MS;
      setMounted(true);
      sheetTranslateY.stopAnimation();
      backdropOpacity.stopAnimation();
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SHEET_SLIDE_OFFSET);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ENTER_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: ENTER_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (mounted) {
      runExitAnimation();
    }
  }, [
    visible,
    mounted,
    backdropOpacity,
    sheetTranslateY,
    runExitAnimation,
  ]);

  const requestClose = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleRequestClose = useCallback(() => {
    if (!visible || isClosingRef.current || isDraggingRef.current) {
      return;
    }
    requestClose();
  }, [requestClose, visible]);

  const handleButtonPress = useCallback(
    (button: AlertDialogButton) => {
      if (button.onPress) {
        void button.onPress();
        return;
      }
      onOpenChange?.(false);
    },
    [onOpenChange],
  );

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  const panHandlersRef = useRef({
    onActivate: (_event: PanGestureEvent) => {},
    onUpdate: (_event: PanGestureActiveEvent) => {},
    onDeactivate: (_event: PanGestureActiveEvent) => {},
  });

  panHandlersRef.current.onActivate = () => {
    isDraggingRef.current = true;
    sheetTranslateY.stopAnimation(value => {
      dragOriginY.current = value;
    });
  };
  panHandlersRef.current.onUpdate = (event: PanGestureActiveEvent) => {
    sheetTranslateY.setValue(
      Math.max(0, dragOriginY.current + event.translationY),
    );
  };
  panHandlersRef.current.onDeactivate = (event: PanGestureActiveEvent) => {
    isDraggingRef.current = false;
    const draggedY = Math.max(0, dragOriginY.current + event.translationY);
    const flickDismiss = event.velocityY > SWIPE_DISMISS_VELOCITY;
    const shouldDismiss = draggedY > SWIPE_DISMISS_DRAG || flickDismiss;

    if (shouldDismiss) {
      exitDurationRef.current = flickDismiss
        ? FLICK_EXIT_DURATION_MS
        : EXIT_DURATION_MS;
      requestCloseRef.current();
      return;
    }

    Animated.spring(sheetTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 0,
    }).start();
  };

  const panGesture = usePanGesture(
    useMemo(
      () => ({
        disableReanimated: true,
        activeOffsetY: [-10000, 8] as [number, number],
        failOffsetX: [-28, 28] as [number, number],
        onActivate: (event: PanGestureEvent) =>
          panHandlersRef.current.onActivate(event),
        onUpdate: (event: PanGestureActiveEvent) =>
          panHandlersRef.current.onUpdate(event),
        onDeactivate: (event: PanGestureActiveEvent) =>
          panHandlersRef.current.onDeactivate(event),
      }),
      [],
    ),
  );

  if (!mounted) {
    return null;
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleRequestClose}
      statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.backdropPressable}
            onPress={handleRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss dialog">
            <Animated.View
              pointerEvents="none"
              style={[
                styles.backdrop,
                {
                  opacity: backdropOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, BACKDROP_OPACITY],
                  }),
                },
              ]}
            />
          </Pressable>
          <GestureDetector gesture={panGesture}>
            <Animated.View
              collapsable={false}
              style={[
                styles.sheet,
                {
                  marginHorizontal: DIALOG_MARGIN,
                  marginTop: DIALOG_MARGIN,
                  marginBottom: Math.max(insets.bottom, DIALOG_MARGIN),
                },
                {transform: [{translateY: sheetTranslateY}]},
              ]}>
              <View style={[styles.content, contentStyle]}>
                <View
                  style={[
                    styles.headerRow,
                    icon ? styles.headerRowWithIcon : null,
                  ]}>
                  {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
                  <CloseButton
                    onPress={handleRequestClose}
                    accessibilityLabel="Close dialog"
                  />
                </View>
                <Text style={styles.title}>{title}</Text>
                {message ? <Text style={styles.message}>{message}</Text> : null}
                {actionButtons.length > 0 ? (
                <View style={styles.footer}>
                  {actionButtons.map((button, index) => (
                    <Button
                      key={`${button.text}-${index}`}
                      label={button.text}
                      variant={buttonVariant(button.style)}
                      onPress={() => handleButtonPress(button)}
                      loading={button.loading}
                      disabled={button.disabled}
                      embedded
                      fullWidth
                    />
                  ))}
                </View>
                ) : null}
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.cardShadow,
  },
  sheet: {
    alignSelf: 'stretch',
  },
  content: {
    backgroundColor: colors.background,
    borderRadius: DIALOG_RADIUS,
    padding: DIALOG_PADDING,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: {width: 0, height: 10},
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginBottom: TITLE_DESCRIPTION_GAP,
  },
  headerRowWithIcon: {
    justifyContent: 'space-between',
    marginBottom: HEADER_ICON_TITLE_GAP,
  },
  iconSlot: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.heading3,
    marginBottom: TITLE_DESCRIPTION_GAP,
  },
  message: {
    ...typography.subtitle,
    marginBottom: DESCRIPTION_FOOTER_GAP,
  },
  footer: {
    gap: spacing.md,
  },
});
