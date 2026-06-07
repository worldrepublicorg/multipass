import React, {useCallback, useMemo} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFooterLayout} from '../../hooks/useFooterBottomInset';
import {FadeInContent} from '../../components/common/FadeInContent';
import {
  colors,
  commonStyles,
  referendumEmptyState,
  spacing,
  typography,
  borderRadius,
} from '../../components/common/styles';
import {sansTextStyle} from '../../theme/fonts';
import type {IDStackParamList, MainParamList} from '../../navigation/types';

const MULTIPASS_TAGLINE = 'World Republic voter verification';

const MULTIPASS_FEATURE_LABELS = ['Secure', 'Private', 'Open source'];

const APP_LOGO = require('../../../assets/logo.png');
const {width: SCREEN_WIDTH} = Dimensions.get('window');
const BOOT_LOGO_WIDTH = Math.min(540, SCREEN_WIDTH - 32);
const EMPTY_LOGO_WIDTH = Math.round(BOOT_LOGO_WIDTH * 0.8);
const EMPTY_LOGO_HEIGHT = (168 / 540) * EMPTY_LOGO_WIDTH;

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<IDStackParamList, 'IDHome'>,
  NativeStackNavigationProp<MainParamList>
>;

type IDEmptyHomeProps = {
  /** Initial load only — gates first-paint entrance animation. */
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
};

/** Empty ID home — Pressable actions to keep startup imports light. */
export function IDEmptyHome({loading, refreshing, onRefresh}: IDEmptyHomeProps) {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const {footerBottom, scrollPaddingBottom} = useFooterLayout({
    footerButtonCount: 1,
  });

  const emptyEntranceKey = useMemo(() => (loading ? null : 'empty'), [loading]);

  const handleAddID = useCallback(() => {
    navigation.navigate('AddIDIntro');
  }, [navigation]);

  const emptyHero = (
    <View style={referendumEmptyState.content}>
      <View style={styles.emptyHero}>
        <Image
          source={APP_LOGO}
          style={styles.emptyLogo}
          resizeMode="contain"
          accessibilityLabel="Multipass"
        />
        <Text style={styles.emptyTitle}>Multipass</Text>
        <Text style={styles.emptyTagline}>{MULTIPASS_TAGLINE}</Text>
        <View style={styles.emptyFeatureRow}>
          {MULTIPASS_FEATURE_LABELS.map((label, index) => (
            <React.Fragment key={label}>
              {index > 0 ? (
                <Text style={styles.emptyFeatureDot}>·</Text>
              ) : null}
              <Text style={styles.emptyFeatureLabel}>{label}</Text>
            </React.Fragment>
          ))}
        </View>
      </View>
    </View>
  );

  const scrollContent = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        referendumEmptyState.centered,
        {paddingTop: insets.top, paddingBottom: scrollPaddingBottom},
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}>
      {emptyHero}
    </ScrollView>
  );

  const footerButtons = (
    <Pressable
      onPress={handleAddID}
      style={({pressed}) => [
        styles.actionButton,
        styles.actionPrimary,
        pressed && styles.actionPressed,
      ]}
      accessibilityRole="button">
      <Text style={styles.actionPrimaryText}>Get started</Text>
    </Pressable>
  );

  const footerStyle = [commonStyles.footerActions, {bottom: footerBottom}];

  const screenBody = (
    <>
      {scrollContent}
      <View style={footerStyle}>{footerButtons}</View>
    </>
  );

  return (
    <View style={styles.container}>
      {emptyEntranceKey ? (
        <FadeInContent
          playKey={emptyEntranceKey}
          motion="fade-up"
          style={styles.container}>
          {screenBody}
        </FadeInContent>
      ) : (
        screenBody
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  emptyHero: {
    width: '100%',
    alignItems: 'center',
  },
  emptyLogo: {
    width: EMPTY_LOGO_WIDTH,
    height: EMPTY_LOGO_HEIGHT,
    marginBottom: spacing.xxl,
  },
  emptyTitle: {
    ...typography.heading2,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.5,
    textAlign: 'center',
    color: colors.text,
  },
  emptyTagline: {
    ...typography.subtitle2,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyFeatureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl + spacing.sm,
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  emptyFeatureLabel: {
    ...typography.body3,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  emptyFeatureDot: {
    ...typography.body3,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
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
  actionPrimaryText: {
    ...sansTextStyle('600'),
    fontSize: 16,
    lineHeight: 19.2,
    color: colors.textOnDark,
  },
  actionPressed: {
    opacity: 0.88,
  },
});
