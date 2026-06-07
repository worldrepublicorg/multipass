import React, {useCallback, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type {StoredID} from '../storage/idStorage';
import {CARD_WIDTH, getIDCardDisplayData} from './idCardShared';

export {getDocumentLabel} from './idCardShared';

const C = {
  void: '#050505',
  ash: '#6e6e6e',
  fog: '#d4d4d4',
  white: '#ffffff',
  dim: 'rgba(255,255,255,0.42)',
};

const CARD_PRESS_SCALE = 0.99;
const CARD_ASPECT = 0.62;

function buildCardStyles(cardWidth: number) {
  const cardHeight = cardWidth * CARD_ASPECT;
  const scale = cardWidth / CARD_WIDTH;
  const arcMotifSize = cardWidth * 0.72;
  const arcOuterRadius = arcMotifSize / 2;
  const arcRingGap = arcOuterRadius / 3;
  const arcInnerRadius = arcOuterRadius - arcRingGap;

  return StyleSheet.create({
    shell: {
      width: cardWidth,
      height: cardHeight,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: C.void,
      borderWidth: 1,
      borderColor: '#222',
      shadowColor: '#000',
      shadowOpacity: 0.42,
      shadowRadius: 22,
      shadowOffset: {width: 0, height: 12},
      elevation: 12,
    },
    arcWrap: {
      position: 'absolute',
      right: -cardWidth * 0.22,
      bottom: -cardWidth * 0.22,
      width: arcMotifSize,
      height: arcMotifSize,
    },
    arcRing: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      borderRadius: arcOuterRadius,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    arcRingInner: {
      position: 'absolute',
      top: arcRingGap,
      left: arcRingGap,
      right: arcRingGap,
      bottom: arcRingGap,
      borderRadius: arcInnerRadius,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.04)',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16 * scale,
      paddingVertical: 10 * scale,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(0,0,0,0.35)',
      zIndex: 1,
    },
    brand: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 10 * scale,
    },
    issuer: {
      color: C.dim,
      fontSize: 8 * scale,
      fontWeight: '800',
      letterSpacing: 1.5,
      maxWidth: '70%',
      textAlign: 'right',
    },
    content: {
      flex: 1,
      padding: 16 * scale,
      justifyContent: 'space-between',
      zIndex: 1,
    },
    name: {
      color: C.white,
      fontSize: 22 * scale,
      fontWeight: '800',
      lineHeight: 29 * scale,
      flex: 1,
      marginTop: 8 * scale,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.1)',
      paddingTop: 12 * scale,
    },
    dataEnd: {alignItems: 'flex-end'},
    key: {
      color: C.ash,
      fontSize: 7 * scale,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginBottom: 4 * scale,
    },
    val: {
      color: C.fog,
      fontSize: 13 * scale,
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
    },
    blur: {opacity: 0.2},
  });
}

interface CardPressableProps {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Spring scale on press — whole child tree moves together (header + body). */
function CardPressable({onPress, style, children}: CardPressableProps) {
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
    springTo(CARD_PRESS_SCALE, 0);
  }, [springTo]);

  const handlePressOut = useCallback(() => {
    springTo(1, 4);
  }, [springTo]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}>
      <Animated.View style={{transform: [{scale}]}}>{children}</Animated.View>
    </Pressable>
  );
}

interface IDCardProps {
  id: StoredID;
  blurred?: boolean;
  onPress?: () => void;
  width?: number;
}

function Brand({style, compact}: {style?: TextStyle; compact?: boolean}) {
  return (
    <Text style={[brand.base, compact && brand.compact, style]}>MULTIPASS</Text>
  );
}

function ArcBackdrop({
  styles: card,
}: {
  styles: ReturnType<typeof buildCardStyles>;
}) {
  return (
    <View pointerEvents="none" style={card.arcWrap}>
      <View style={card.arcRing} />
      <View style={card.arcRingInner} />
    </View>
  );
}

export function IDCard({
  id,
  blurred = false,
  onPress,
  width = CARD_WIDTH,
}: IDCardProps) {
  const d = getIDCardDisplayData(id);
  const card = useMemo(() => buildCardStyles(width), [width]);
  const scale = width / CARD_WIDTH;

  const content = (
    <View style={card.shell}>
      <ArcBackdrop styles={card} />
      <View style={card.header}>
        <Brand style={card.brand} compact={scale < 0.95} />
        <Text style={card.issuer}>
          {d.docType.toUpperCase()} · {d.countryCode}
        </Text>
      </View>
      <View style={card.content}>
        <Text style={[card.name, blurred && card.blur]} numberOfLines={2}>
          {blurred ? '████████' : d.fullName}
        </Text>
        <View style={card.dataRow}>
          <View>
            <Text style={card.key}>DOCUMENT NUMBER</Text>
            <Text style={[card.val, blurred && card.blur]}>
              {blurred ? '••••' : d.maskedDocNum}
            </Text>
          </View>
          <View style={card.dataEnd}>
            <Text style={card.key}>EXPIRY DATE</Text>
            <Text style={[card.val, blurred && card.blur]}>
              {blurred ? '••/••' : d.expiry}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return <CardPressable onPress={onPress}>{content}</CardPressable>;
  }
  return content;
}

const brand = StyleSheet.create({
  base: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 3,
  },
  compact: {
    letterSpacing: 3,
  },
});
