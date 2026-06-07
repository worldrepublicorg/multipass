import {Text, TextInput, type TextStyle} from 'react-native';

import {sansTextStyle} from './fonts';

type TextWithDefaults = typeof Text & {
  defaultProps?: {style?: TextStyle};
};

type TextInputWithDefaults = typeof TextInput & {
  defaultProps?: {style?: TextStyle};
};

/** Default app typeface (TWK Lausanne regular). */
export function setupDefaultFonts(): void {
  const base = sansTextStyle('400');

  const TextComponent = Text as TextWithDefaults;
  TextComponent.defaultProps = TextComponent.defaultProps ?? {};
  TextComponent.defaultProps.style = base;

  const TextInputComponent = TextInput as TextInputWithDefaults;
  TextInputComponent.defaultProps = TextInputComponent.defaultProps ?? {};
  TextInputComponent.defaultProps.style = base;
}
