import React, {useCallback, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  BackHandler,
  Platform,
  Pressable,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {Icon} from 'phosphor-react-native';
import {
  CodeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from 'phosphor-react-native';
import {useFooterLayout} from '../../../hooks/useFooterBottomInset';
import {ScreenBackHeader} from '../../../components/common/ScreenBackHeader';
import {alertIcons, showSimpleAlert} from '../../../components/common/alertHelpers';
import {
  colors,
  commonStyles,
  borderRadius,
  referendumEmptyState,
  spacing,
  typography,
} from '../../../components/common/styles';
import {sansTextStyle} from '../../../theme/fonts';
import type {IDStackParamList} from '../../../navigation/types';

type NavigationProp = NativeStackNavigationProp<
  IDStackParamList,
  'AddIDIntro'
>;

const GITHUB_URL = 'https://github.com/worldrepublicorg/multipass';

const VALUE_PROPS: {title: string; description: string; Icon: Icon}[] = [
  {
    title: 'Secure',
    description:
      'Your data stays on your device. No central database, no data-breach risk.',
    Icon: ShieldCheckIcon,
  },
  {
    title: 'Private',
    description:
      'The World Republic only learns your ID is valid, not what\'s on your document.',
    Icon: EyeSlashIcon,
  },
  {
    title: 'Open source',
    description:
      'The code is public. You can see exactly how verification works.',
    Icon: CodeIcon,
  },
];

/** First add-ID step — short overview before chip check. */
export function AddIDIntroScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {footerBottom, scrollPaddingBottom} = useFooterLayout({
    footerButtonCount: 2,
  });

  const handleBack = useCallback(() => {
    navigation.popTo('IDHome');
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [handleBack]);

  const handleContinue = useCallback(() => {
    navigation.navigate('AddIDChipCheck');
  }, [navigation]);

  const handleAuditSourceCode = useCallback(async () => {
    try {
      await Linking.openURL(GITHUB_URL);
    } catch {
      showSimpleAlert({
        title: "Couldn't open link",
        message: 'Check your connection and try again.',
        icon: alertIcons.link,
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      <ScreenBackHeader onPress={handleBack} />
      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={[
          commonStyles.screenBody,
          {paddingBottom: scrollPaddingBottom},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>About Multipass</Text>
          <Text style={commonStyles.pageSubtitle}>
            World Republic voter verification using government-issued IDs
          </Text>
        </View>

        <View style={commonStyles.flowStepsGap}>
          <View style={styles.valueProps}>
            {VALUE_PROPS.map(({title, description, Icon: PropIcon}) => (
              <View key={title} style={styles.valuePropRow}>
                <View style={referendumEmptyState.featureIconCircle}>
                  <PropIcon
                    size={14}
                    color={colors.textMuted}
                    weight="fill"
                  />
                </View>
                <View style={styles.valuePropCopy}>
                  <Text style={styles.valuePropTitle}>{title}</Text>
                  <Text style={styles.valuePropDescription}>{description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[commonStyles.footerActions, {bottom: footerBottom}]}>
        <Pressable
          onPress={handleContinue}
          style={({pressed}) => [
            styles.actionButton,
            styles.actionPrimary,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button">
          <Text style={styles.actionPrimaryText}>Continue</Text>
        </Pressable>
        <Pressable
          onPress={handleAuditSourceCode}
          style={({pressed}) => [
            styles.actionButton,
            styles.actionTertiary,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button">
          <Text style={styles.actionTertiaryText}>Read source code</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionButton: {
    alignSelf: 'stretch',
    borderRadius: borderRadius.full,
    minHeight: 56,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: '#050505',
  },
  actionTertiary: {
    backgroundColor: colors.surface,
  },
  actionPrimaryText: {
    ...sansTextStyle('600'),
    fontSize: 16,
    lineHeight: 19.2,
    color: colors.textOnDark,
  },
  actionTertiaryText: {
    ...sansTextStyle('600'),
    fontSize: 16,
    lineHeight: 19.2,
    color: colors.primary,
  },
  actionPressed: {
    opacity: 0.88,
  },
  valueProps: {
    gap: spacing.lg,
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  valuePropCopy: {
    flex: 1,
  },
  valuePropTitle: {
    ...sansTextStyle('600'),
    fontSize: 15,
    color: colors.text,
  },
  valuePropDescription: {
    ...typography.body3,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
