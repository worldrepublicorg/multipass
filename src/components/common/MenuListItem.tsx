import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {IconSlot} from './IconSlot';
import {colors, spacing, typography} from './styles';

type MenuListItemProps = {
  label: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** RN counterpart of world-republic `CustomListItem` (Menu page rows). */
export function MenuListItem({
  label,
  icon,
  endAdornment,
  onPress,
  style,
}: MenuListItemProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.8}>
      {icon ? <IconSlot>{icon}</IconSlot> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {endAdornment ? (
        <View style={styles.endAdornment}>{endAdornment}</View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    backgroundColor: colors.surfaceDark,
    padding: spacing.lg,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  label: {
    flex: 1,
    ...typography.subtitle3,
    color: colors.text,
  },
  endAdornment: {
    marginLeft: spacing.lg,
    flexShrink: 0,
  },
});
