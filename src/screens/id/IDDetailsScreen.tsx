import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  AlertDialog,
  Button,
  DetailListGroup,
  DetailListItem,
  MenuListItem,
  MenuSection,
  ScreenBackHeader,
} from '../../components/common';
import {IdentificationCardIcon, TrashIcon} from 'phosphor-react-native';
import {getDocumentLabel} from '../../components/IDCard';
import {Spinner} from '../../components/common/Spinner';
import {
  colors,
  commonStyles,
  menuListIcon,
  menuScreenStyles,
} from '../../components/common/styles';
import {verificationStatusStyles} from '../verification/verificationStatusStyles';
import {useID} from '../../hooks/useID';
import {getStoredID, type StoredID} from '../../storage/idStorage';
import type {IDStackParamList} from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<IDStackParamList, 'IDDetails'>;
type RouteType = RouteProp<IDStackParamList, 'IDDetails'>;

export function IDDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const {hasID, clearID} = useID();
  const [id, setId] = useState<StoredID | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  const deleteDialogIcon = (
    <TrashIcon
      size={30}
      color={colors.textMuted}
      weight="fill"
    />
  );

  const loadID = useCallback(async () => {
    setLoading(true);
    const data = await getStoredID();
    setId(data && data.id === route.params.id ? data : null);
    setLoading(false);
  }, [route.params.id]);

  useEffect(() => {
    loadID();
  }, [loadID]);

  const handleDeleteID = useCallback(() => {
    setDeleteDialogVisible(true);
  }, []);

  const handleConfirmDeleteID = useCallback(async () => {
    setDeleting(true);
    try {
      await clearID();
      setDeleteDialogVisible(false);
      navigation.popTo('IDHome');
    } finally {
      setDeleting(false);
    }
  }, [clearID, navigation]);

  if (loading) {
    return (
      <View style={commonStyles.screen}>
        <ScreenBackHeader onPress={() => navigation.goBack()} />
        <View style={commonStyles.screenCentered}>
          <Spinner centered />
        </View>
      </View>
    );
  }

  if (!id) {
    return (
      <View style={commonStyles.screen}>
        <ScreenBackHeader onPress={() => navigation.goBack()} />
        <View style={[commonStyles.screenCentered, styles.notFoundBody]}>
          <View style={verificationStatusStyles.statusLayout}>
            <View style={styles.notFoundIconCircle}>
              <IdentificationCardIcon
                size={32}
                color={colors.textMuted}
                weight="fill"
              />
            </View>
            <View style={verificationStatusStyles.statusBody}>
              <Text style={verificationStatusStyles.statusTitle}>ID not found</Text>
              <View style={styles.notFoundActions}>
                <Button
                  label="Go back"
                  onPress={() => navigation.goBack()}
                  embedded
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const docType = getDocumentLabel(id.mrzDocCode);
  const fullName = `${id.firstName} ${id.lastName}`.trim();

  return (
    <View style={commonStyles.screen}>
      <ScreenBackHeader onPress={() => navigation.goBack()} />
      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={commonStyles.menuScreenBody}
        showsVerticalScrollIndicator={false}>
        <View style={menuScreenStyles.sections}>
          <MenuSection title="DOCUMENT DETAILS">
            <DetailListGroup>
              <DetailListItem label="Name" value={fullName} />
              <DetailListItem label="Document type" value={docType} />
              <DetailListItem
                label="Document number"
                value={id.documentNumber}
              />
              <DetailListItem label="Nationality" value={id.nationality} />
              <DetailListItem label="Date of birth" value={id.dateOfBirth} />
              <DetailListItem label="Gender" value={id.gender || 'N/A'} />
              <DetailListItem label="Expiry date" value={id.expiryDate} />
            </DetailListGroup>
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
  notFoundBody: {
    paddingHorizontal: 32,
  },
  notFoundIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundActions: {
    marginTop: 24,
    width: '100%',
  },
  deleteIDButtonDisabled: {
    opacity: 0.5,
  },
});
