import React, {useCallback, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  BackHandler,
  Platform,
  Pressable,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFooterLayout} from '../../../hooks/useFooterBottomInset';
import {ScreenBackHeader} from '../../../components/common/ScreenBackHeader';
import {
  colors,
  commonStyles,
  borderRadius,
  spacing,
} from '../../../components/common/styles';
import {sansTextStyle} from '../../../theme/fonts';
import type {IDStackParamList} from '../../../navigation/types';

const CHIP_SYMBOL = require('../../../../assets/logo.png');
type NavigationProp = NativeStackNavigationProp<
  IDStackParamList,
  'AddIDChipCheck'
>;

/** Pressable footer buttons — avoids Button on this first add-ID step. */
export function ChipCheckScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {footerBottom, scrollPaddingBottom} = useFooterLayout();

  const handleBack = useCallback(() => {
    navigation.goBack();
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

  const handleYes = useCallback(() => {
    navigation.navigate('AddIDMrz');
  }, [navigation]);

  const handleNo = useCallback(() => {
    navigation.popTo('IDHome');
  }, [navigation]);

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
          <Text style={commonStyles.pageTitle}>Check your document</Text>
          <Text style={commonStyles.pageSubtitle}>
            Make sure your passport or ID card has the NFC chip symbol, which is
            required for registration
          </Text>
        </View>

        <View style={commonStyles.flowStepsGap}>
          <View style={styles.iconWell}>
            <View style={styles.iconFrame}>
              <Image
                source={CHIP_SYMBOL}
                style={styles.chipIcon}
                resizeMode="contain"
                accessibilityLabel="Biometric chip symbol"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[commonStyles.footerActions, {bottom: footerBottom}]}>
        <Pressable
          onPress={handleYes}
          style={({pressed}) => [
            styles.actionButton,
            styles.actionPrimary,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button">
          <Text style={styles.actionPrimaryText}>Yes, I have it</Text>
        </Pressable>
        <Pressable
          onPress={handleNo}
          style={({pressed}) => [
            styles.actionButton,
            styles.actionTertiary,
            pressed && styles.actionPressed,
          ]}
          accessibilityRole="button">
          <Text style={styles.actionTertiaryText}>No, I don't have it</Text>
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
  iconWell: {
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  iconFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 4,
  },
  chipIcon: {
    width: 180,
    height: 114,
  },
});
