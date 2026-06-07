import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import type {StyleProp, ViewStyle} from 'react-native';

import {colors, spacing, typography} from './styles';

const textMetrics = Platform.select({
  android: {includeFontPadding: false as const},
  default: {},
});

export const DETAIL_LIST_OUTER_RADIUS = 16;
export const DETAIL_LIST_INNER_RADIUS = 4;
export const DETAIL_LIST_ITEM_GAP = 2;

export type DetailListItemPosition = 'only' | 'first' | 'middle' | 'last';

type DetailListItemProps = {
  label: string;
  value: string;
  position?: DetailListItemPosition;
};

function radiusStyle(position: DetailListItemPosition): ViewStyle {
  const outer = DETAIL_LIST_OUTER_RADIUS;
  const inner = DETAIL_LIST_INNER_RADIUS;

  switch (position) {
    case 'first':
      return {
        borderTopLeftRadius: outer,
        borderTopRightRadius: outer,
        borderBottomLeftRadius: inner,
        borderBottomRightRadius: inner,
      };
    case 'middle':
      return {
        borderRadius: inner,
      };
    case 'last':
      return {
        borderTopLeftRadius: inner,
        borderTopRightRadius: inner,
        borderBottomLeftRadius: outer,
        borderBottomRightRadius: outer,
      };
    case 'only':
    default:
      return {
        borderRadius: outer,
      };
  }
}

/** RN counterpart of world-republic `CustomListItem` with label + description (no end icon). */
export function DetailListItem({
  label,
  value,
  position = 'only',
}: DetailListItemProps) {
  return (
    <View style={[styles.container, radiusStyle(position)]}>
      <Text style={[styles.label, textMetrics]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, textMetrics]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

type DetailListGroupProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Stacks detail rows with grouped corner radii and a 2px gap between items. */
export function DetailListGroup({children, style}: DetailListGroupProps) {
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const count = items.length;

  return (
    <View style={[styles.group, style]}>
      {items.map((child, index) => {
        const position: DetailListItemPosition =
          count <= 1
            ? 'only'
            : index === 0
              ? 'first'
              : index === count - 1
                ? 'last'
                : 'middle';

        return React.cloneElement(
          child as React.ReactElement<DetailListItemProps>,
          {position, key: child.key ?? index},
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: DETAIL_LIST_ITEM_GAP,
    width: '100%',
  },
  container: {
    minHeight: 56,
    backgroundColor: colors.surfaceDark,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  label: {
    flexShrink: 0,
    ...typography.body4,
    color: colors.textSecondary,
  },
  value: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    ...typography.subtitle3,
    color: colors.text,
  },
});
