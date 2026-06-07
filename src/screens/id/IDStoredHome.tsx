import React, {useCallback, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFooterLayout} from '../../hooks/useFooterBottomInset';
import {IDCard} from '../../components/IDCard';
import {AppHeader, Button} from '../../components/common';
import {alertIcons, showSimpleAlert} from '../../components/common/alertHelpers';
import {FadeInContent} from '../../components/common/FadeInContent';
import {colors, commonStyles} from '../../components/common/styles';
import {isServerQrScannerAvailable} from '../../native/serverQrScanner';
import type {StoredID} from '../../storage/idStorage';
import type {IDStackParamList} from '../../navigation/types';
import {
  isQrScanCancelled,
  openSessionFromQrScan,
} from '../../utils/openSessionFromQrScan';

type NavigationProp = NativeStackNavigationProp<IDStackParamList, 'IDHome'>;

type IDStoredHomeProps = {
  id: StoredID;
  refreshing: boolean;
  onRefresh: () => void;
};

export function IDStoredHome({id, refreshing, onRefresh}: IDStoredHomeProps) {
  const navigation = useNavigation<NavigationProp>();
  const [openingDetails, setOpeningDetails] = useState(false);
  const [scanning, setScanning] = useState(false);
  const qrScannerAvailable = isServerQrScannerAvailable();
  const {footerBottom, scrollPaddingBottom: footerScrollPadding} =
    useFooterLayout({footerButtonCount: 1});
  const scrollPaddingBottom = qrScannerAvailable
    ? footerScrollPadding
    : footerBottom;

  const handleCardPress = useCallback(async () => {
    if (openingDetails) {
      return;
    }
    setOpeningDetails(true);
    try {
      const {authenticateUser} = await import('../../hooks/useAuth');
      const authenticated = await authenticateUser(
        'View document details',
      );
      if (!authenticated) return;
      navigation.navigate('IDDetails', {id: id.id});
    } finally {
      setOpeningDetails(false);
    }
  }, [navigation, id.id, openingDetails]);

  const handleScanQR = useCallback(async () => {
    if (scanning || !qrScannerAvailable) {
      return;
    }

    setScanning(true);
    try {
      await openSessionFromQrScan();
    } catch (error: unknown) {
      if (!isQrScanCancelled(error)) {
        showSimpleAlert({
          title: 'Scan failed',
          message:
            error instanceof Error
              ? error.message
              : "Couldn't read the QR code.",
          icon: alertIcons.qr,
        });
      }
    } finally {
      setScanning(false);
    }
  }, [qrScannerAvailable, scanning]);

  const screenBody = (
    <>
      <AppHeader />

      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: scrollPaddingBottom},
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardSection}>
          <IDCard id={id} onPress={handleCardPress} />
        </View>
      </ScrollView>

      {qrScannerAvailable ? (
        <View style={[commonStyles.footerActions, {bottom: footerBottom}]}>
          <Button
            label={scanning ? 'Opening camera...' : 'Scan QR code'}
            onPress={handleScanQR}
            disabled={scanning}
            loading={scanning}
            variant="tertiary"
            embedded
          />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      <FadeInContent
        playKey="stored"
        motion="fade"
        durationMs={300}
        style={styles.container}>
        {screenBody}
      </FadeInContent>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
  },
  cardSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
