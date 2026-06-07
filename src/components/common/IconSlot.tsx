import React from 'react';
import {View, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';

type IconSlotProps = {
  children: React.ReactNode;
  slotSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** Fixed-size row slot for Phosphor icons (menu lists, tips). */
export function IconSlot({
  children,
  slotSize = 20,
  style,
}: IconSlotProps) {
  return (
    <View style={[styles.slot, {width: slotSize, height: slotSize}, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
});
