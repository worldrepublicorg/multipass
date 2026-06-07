import React, {useCallback, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  BackHandler,
  Platform,
  Linking,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {CompositeNavigationProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  AlertDialog,
  MenuListItem,
  MenuSection,
  ScreenBackHeader,
} from '../../components/common';
import {alertIcons, showSimpleAlert} from '../../components/common/alertHelpers';
import {
  ArrowSquareOutIcon,
  BookOpenTextIcon,
  ClockCounterClockwiseIcon,
  GithubLogoIcon,
  GlobeIcon,
  TrashIcon,
} from 'phosphor-react-native';
import {useID} from '../../hooks/useID';
import {
  commonStyles,
  colors,
  menuListEndIcon,
  menuListIcon,
  menuScreenStyles,
} from '../../components/common/styles';
import type {MenuStackParamList, MainParamList} from '../../navigation/types';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<MenuStackParamList, 'MenuHome'>,
  NativeStackNavigationProp<MainParamList>
>;

const WEB_APP_URL = 'https://www.worldrepublic.org';
const GITHUB_URL = 'https://github.com/worldrepublicorg/multipass';
const WIKI_URL = 'https://wiki.worldrepublic.org';

const externalLinkEndIcon = (
  <ArrowSquareOutIcon
    size={menuListEndIcon.size}
    color={menuListEndIcon.color}
    weight={menuListEndIcon.weight}
  />
);

export function MenuScreen() {
  const navigation = useNavigation<NavigationProp>();
  const mainNavigation =
    navigation.getParent<NativeStackNavigationProp<MainParamList>>();
  const {hasID, clearID, refresh: refreshID} = useID();
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const deleteDialogIcon = (
    <TrashIcon size={30} color={colors.textMuted} weight="fill" />
  );

  const handleBack = useCallback(() => {
    mainNavigation?.popTo('ID');
  }, [mainNavigation]);

  const handleHistory = useCallback(() => {
    navigation.navigate('HistoryList');
  }, [navigation]);

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showSimpleAlert({
        title: "Couldn't open link",
        message: 'Check your connection and try again.',
        icon: alertIcons.link,
      });
    }
  }, []);

  const handleDeleteID = useCallback(() => {
    setDeleteDialogVisible(true);
  }, []);

  const handleConfirmDeleteID = useCallback(async () => {
    setDeleting(true);
    try {
      await clearID();
      setDeleteDialogVisible(false);
      mainNavigation?.popTo('ID');
    } finally {
      setDeleting(false);
    }
  }, [clearID, mainNavigation]);

  useFocusEffect(
    useCallback(() => {
      refreshID();

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
    }, [handleBack, refreshID]),
  );

  return (
    <View style={commonStyles.screen}>
      <ScreenBackHeader onPress={handleBack} />
      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={commonStyles.menuScreenBody}
        showsVerticalScrollIndicator={false}>
        <View style={menuScreenStyles.sections}>
          <MenuSection title="HISTORY">
            <MenuListItem
              label="Verification history"
              icon={
                <ClockCounterClockwiseIcon
                  size={menuListIcon.size}
                  color={menuListIcon.color}
                  weight={menuListIcon.weight}
                />
              }
              onPress={handleHistory}
            />
          </MenuSection>
          <MenuSection title="LEARN MORE">
            <MenuListItem
              label="World Republic"
              icon={
                <GlobeIcon
                  size={menuListIcon.size}
                  color={menuListIcon.color}
                  weight={menuListIcon.weight}
                />
              }
              endAdornment={externalLinkEndIcon}
              onPress={() => handleOpenLink(WEB_APP_URL)}
            />
            <MenuListItem
              label="Wiki"
              icon={
                <BookOpenTextIcon
                  size={menuListIcon.size}
                  color={menuListIcon.color}
                  weight={menuListIcon.weight}
                />
              }
              endAdornment={externalLinkEndIcon}
              onPress={() => handleOpenLink(WIKI_URL)}
            />
            <MenuListItem
              label="GitHub"
              icon={
                <GithubLogoIcon
                  size={menuListIcon.size}
                  color={menuListIcon.color}
                  weight={menuListIcon.weight}
                />
              }
              endAdornment={externalLinkEndIcon}
              onPress={() => handleOpenLink(GITHUB_URL)}
            />
          </MenuSection>
          {hasID && (
            <MenuSection title="DANGER ZONE">
              <MenuListItem
                label={deleting ? 'Deleting...' : 'Delete ID'}
                icon={
                  <TrashIcon
                    size={menuListIcon.size}
                    color={menuListIcon.color}
                    weight={menuListIcon.weight}
                  />
                }
                onPress={deleting ? () => {} : handleDeleteID}
                style={deleting ? styles.deleteIDButtonDisabled : undefined}
              />
            </MenuSection>
          )}
        </View>
      </ScrollView>
      <AlertDialog
        visible={deleteDialogVisible}
        onOpenChange={setDeleteDialogVisible}
        onDismiss={() => setDeleteDialogVisible(false)}
        title="Delete ID"
        message="Are you sure you want to delete this ID?"
        icon={deleteDialogIcon}
        buttons={[
          {
            text: 'Delete',
            style: 'destructive',
            loading: deleting,
            disabled: deleting,
            onPress: handleConfirmDeleteID,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  deleteIDButtonDisabled: {
    opacity: 0.5,
  },
});
