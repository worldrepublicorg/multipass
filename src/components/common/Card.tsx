import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {colors, borderRadius, typography} from './styles';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  dark?: boolean;
  style?: object;
}

export function Card({title, children, dark, style}: CardProps) {
  return (
    <View style={[styles.card, dark && styles.cardDark, style]}>
      {title ? (
        <Text style={[styles.cardTitle, dark && styles.cardTitleDark]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 2,
  },
  cardDark: {
    backgroundColor: colors.surfaceDark,
  },
  cardTitle: {
    ...typography.sectionTitle,
    marginBottom: 10,
  },
  cardTitleDark: {
    color: colors.textOnDark,
  },
});
