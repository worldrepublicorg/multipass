import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  BackHandler,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFooterLayout} from '../../../hooks/useFooterBottomInset';
import {Button, ScreenBackHeader} from '../../../components/common';
import {alertIcons, showSimpleAlert} from '../../../components/common/alertHelpers';
import {MrzDocumentSkeleton} from '../../../components/MrzDocumentSkeleton';
import {
  colors,
  commonStyles,
  spacing,
  typography,
} from '../../../components/common/styles';
import {getMrzScanner, isMrzScannerAvailable} from '../../../native/mrzScanner';
import type {IDStackParamList} from '../../../navigation/types';
const CAMERA_DESCRIPTION =
  'Point your camera at the machine readable zone of your document';
const MANUAL_DESCRIPTION = 'Enter the details shown on your document';
const SCAN_FALLBACK_HINT = "Scan didn't work — enter details manually.";

type NavigationProp = NativeStackNavigationProp<IDStackParamList, 'AddIDMrz'>;

export function MrzScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {footerBottom, scrollPaddingBottom} = useFooterLayout();
  const [showManual, setShowManual] = useState(false);
  const [scanFallbackHint, setScanFallbackHint] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [doc, setDoc] = useState('');
  const [dob, setDob] = useState('');
  const [exp, setExp] = useState('');

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

  const startCameraScan = useCallback(async () => {
    if (!isMrzScannerAvailable()) {
      setScanFallbackHint(true);
      setShowManual(true);
      return;
    }
    setScanning(true);
    setScanFallbackHint(false);
    try {
      const result = await getMrzScanner().scan();
      navigation.navigate('AddIDNfc', {
        documentNumber: result.documentNumber.padEnd(9, '<'),
        dateOfBirth: result.dateOfBirth,
        dateOfExpiry: result.dateOfExpiry,
      });
    } catch (error: any) {
      if (
        error?.message?.includes('cancelled') ||
        error?.message?.includes('Cancelled')
      ) {
        return;
      }
      setScanFallbackHint(true);
      setShowManual(true);
    } finally {
      setScanning(false);
    }
  }, [navigation]);

  const submitManual = useCallback(() => {
    const d = doc.trim().toUpperCase();
    const b = dob.trim();
    const e = exp.trim();

    if (!d) {
      showSimpleAlert({
        title: 'Document number required',
        message: 'Enter your document number.',
        icon: alertIcons.form,
      });
      return;
    }
    if (!/^\d{6}$/.test(b)) {
      showSimpleAlert({
        title: 'Invalid birth date',
        message: 'Use YYMMDD format.',
        icon: alertIcons.form,
      });
      return;
    }
    if (!/^\d{6}$/.test(e)) {
      showSimpleAlert({
        title: 'Invalid expiry date',
        message: 'Use YYMMDD format.',
        icon: alertIcons.form,
      });
      return;
    }

    navigation.navigate('AddIDNfc', {
      documentNumber: d.padEnd(9, '<'),
      dateOfBirth: b,
      dateOfExpiry: e,
    });
  }, [doc, dob, exp, navigation]);

  return (
    <View style={styles.container}>
      <ScreenBackHeader onPress={handleBack} />
      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={[
          commonStyles.screenBody,
          {paddingBottom: scrollPaddingBottom},
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={commonStyles.pageHeader}>
          <Text style={commonStyles.pageTitle}>Scan your ID</Text>
          <Text style={commonStyles.pageSubtitle}>
            {showManual ? MANUAL_DESCRIPTION : CAMERA_DESCRIPTION}
          </Text>
        </View>

        <View style={commonStyles.flowStepsGap}>
          {!showManual && <MrzDocumentSkeleton />}

          {showManual ? (
            <View style={styles.manualForm}>
              {scanFallbackHint ? (
                <Text style={styles.scanFallbackHint}>{SCAN_FALLBACK_HINT}</Text>
              ) : null}
              <View style={styles.field}>
                <Text style={styles.label}>DOCUMENT NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={doc}
                  onChangeText={setDoc}
                  placeholder="AB1234567"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={9}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  DATE OF BIRTH <Text style={styles.labelHint}>(YYMMDD)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={dob}
                  onChangeText={setDob}
                  placeholder="900115"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  EXPIRY DATE <Text style={styles.labelHint}>(YYMMDD)</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={exp}
                  onChangeText={setExp}
                  placeholder="300115"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                />
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[commonStyles.footerActions, {bottom: footerBottom}]}>
        {!showManual ? (
          <>
            <Button
              label={scanning ? 'Opening camera...' : 'Open camera scanner'}
              onPress={startCameraScan}
              loading={scanning}
              embedded
            />
            <Button
              label="Enter MRZ manually"
              onPress={() => {
                setScanFallbackHint(false);
                setShowManual(true);
              }}
              variant="tertiary"
              embedded
            />
          </>
        ) : (
          <>
            <Button label="Continue to NFC" onPress={submitManual} embedded />
            {isMrzScannerAvailable() ? (
              <Button
                label="Use camera instead"
                onPress={() => {
                  setShowManual(false);
                  setScanFallbackHint(false);
                }}
                variant="tertiary"
                embedded
              />
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  manualForm: {
    gap: spacing.xl,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.primaryDark,
  },
  labelHint: {
    ...typography.body4,
    color: colors.textMuted,
  },
  input: {
    ...typography.subtitle3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.surfaceDark,
    color: colors.text,
  },
  scanFallbackHint: {
    ...typography.body3,
    color: colors.textSecondary,
  },
});
