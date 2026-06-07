import React, {useCallback, useMemo, useState} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useNavigation, useRoute, useFocusEffect} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Button,
  DetailListGroup,
  DetailListItem,
  MenuSection,
  ScreenBackHeader,
} from '../../components/common';
import {alertIcons, showSimpleAlert} from '../../components/common/alertHelpers';
import {showAlert} from '../../components/common/AlertDialogProvider';
import {Card} from '../../components/common/Card';
import {
  colors,
  commonStyles,
  menuScreenStyles,
  typography,
} from '../../components/common/styles';
import {useFooterLayout} from '../../hooks/useFooterBottomInset';
import {getStoredID} from '../../storage/idStorage';
import {
  validateIDAgainstQuery,
  formatRequirementsSummary,
} from '../../services/requirementsValidator';
import {authenticateUser} from '../../hooks/useAuth';
import {
  humanizeScope,
  isSupportedSessionRequest,
  unsupportedSessionMessage,
} from '../../services/validity';
import type {
  VerificationStackParamList,
  RootStackParamList,
} from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<
  VerificationStackParamList,
  'SessionDetails'
>;
type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteType = RouteProp<VerificationStackParamList, 'SessionDetails'>;

function parseRequirement(req: string): {label: string; value: string} {
  const colonIndex = req.indexOf(': ');
  if (colonIndex >= 0) {
    return {
      label: req.slice(0, colonIndex),
      value: req.slice(colonIndex + 2),
    };
  }
  return {label: 'Requirement', value: req};
}

export function SessionDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const rootNavigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteType>();
  const {request} = route.params;
  const [continuing, setContinuing] = useState(false);
  const {footerBottom, scrollPaddingBottom} = useFooterLayout({
    footerButtonCount: 2,
  });
  const supported = useMemo(
    () => isSupportedSessionRequest(request),
    [request],
  );
  const unsupportedCopy = useMemo(() => unsupportedSessionMessage(), []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setContinuing(false);
      };
    }, []),
  );

  const requirements = useMemo(
    () => formatRequirementsSummary(request.query),
    [request.query],
  );

  const actionLabel = useMemo(() => {
    if (request.service?.purpose?.trim()) {
      return request.service.purpose.trim();
    }
    const scope = request.service?.scope?.trim();
    return scope ? humanizeScope(scope) : 'Verification';
  }, [request.service?.purpose, request.service?.scope]);

  const handleCancel = () => {
    navigation.getParent()?.goBack();
  };

  const handleAddID = useCallback(() => {
    rootNavigation.navigate('Main', {
      screen: 'ID',
      params: {screen: 'AddIDIntro'},
    });
  }, [rootNavigation]);

  const handleContinue = useCallback(async () => {
    if (!supported) {
      showSimpleAlert({
        title: unsupportedCopy.title,
        message: unsupportedCopy.detail,
        icon: alertIcons.unsupported,
      });
      return;
    }

    try {
      const storedId = await getStoredID();
      if (!storedId) {
        showAlert({
          title: 'No ID on this device',
          message: 'Add an ID before you can continue.',
          icon: alertIcons.id,
          buttons: [{text: 'Add ID', onPress: handleAddID}],
        });
        return;
      }

      const validation = validateIDAgainstQuery(storedId, request.query);
      if (!validation.valid) {
        showSimpleAlert({
          title: 'Requirements not met',
          message: validation.errors.join(' '),
          icon: alertIcons.warning,
        });
        return;
      }

      setContinuing(true);
      try {
        const authenticated = await authenticateUser('Confirm verification');
        if (!authenticated) return;
        navigation.navigate('VerificationProgress', {request});
      } finally {
        setContinuing(false);
      }
    } catch (err: any) {
      showSimpleAlert({
        title: "Couldn't continue",
        message: err?.message || 'Something went wrong. Try again.',
      });
    }
  }, [handleAddID, navigation, request, supported, unsupportedCopy]);

  return (
    <View style={commonStyles.screen}>
      <ScreenBackHeader onPress={handleCancel} variant="close" />

      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={[
          commonStyles.screenBody,
          {paddingBottom: scrollPaddingBottom},
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Verification requested</Text>
          <Text style={commonStyles.pageSubtitle}>
            Review request details before you continue
          </Text>
        </View>

        <View style={menuScreenStyles.sections}>
          <View style={commonStyles.flowStepsGap}>
            <DetailListGroup>
              <DetailListItem
                label="App"
                value={request.service?.name || 'World Republic'}
              />
              <DetailListItem label="Action" value={actionLabel} />
              <DetailListItem label="Validity" value="ID not expired" />
            </DetailListGroup>
          </View>

          {requirements.length > 0 ? (
            <MenuSection title="REQUIREMENTS">
              <DetailListGroup>
                {requirements.map((req, index) => {
                  const {label, value} = parseRequirement(req);
                  return (
                    <DetailListItem key={index} label={label} value={value} />
                  );
                })}
              </DetailListGroup>
            </MenuSection>
          ) : null}

          {!supported ? (
            <Card title={unsupportedCopy.title}>
              <Text style={styles.unsupportedDetail}>
                {unsupportedCopy.detail}
              </Text>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      <View style={[commonStyles.footerActions, {bottom: footerBottom}]}>
        <Button
          label="Continue"
          onPress={handleContinue}
          loading={continuing}
          disabled={continuing || !supported}
          embedded
          fullWidth
        />
        <Button
          label="Cancel"
          onPress={handleCancel}
          variant="tertiary"
          embedded
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  unsupportedDetail: {
    ...typography.body3,
    color: colors.error,
  },
});
