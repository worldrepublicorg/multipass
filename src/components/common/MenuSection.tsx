import React from 'react';
import {Text, View} from 'react-native';

import {menuScreenStyles} from './styles';

type MenuSectionProps = {
  title: string;
  children: React.ReactNode;
};

/** world-republic Menu section: gray subtitle header + `gap-2` list rows. */
export function MenuSection({title, children}: MenuSectionProps) {
  return (
    <View>
      <Text style={menuScreenStyles.sectionTitle}>{title}</Text>
      <View style={menuScreenStyles.sectionItems}>{children}</View>
    </View>
  );
}
