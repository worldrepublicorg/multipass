import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  BackHandler,
  Platform,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  ArrowsClockwiseIcon,
  CalendarXIcon,
  CaretDownIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'phosphor-react-native';
import {MenuSection, ScreenBackHeader, Spinner} from '../../components/common';
import {IconSlot} from '../../components/common/IconSlot';
import {
  colors,
  commonStyles,
  historyScreenStyles,
  menuListIcon,
  menuScreenStyles,
  spacing,
  typography,
} from '../../components/common/styles';
import type {MainParamList, MenuStackParamList} from '../../navigation/types';
import {
  getAllSignatures,
  getSignatureStatusDisplay,
  groupSignaturesByDate,
  type SignatureRecord,
} from '../../storage/historyStorage';

type NavigationProp = NativeStackNavigationProp<
  MenuStackParamList,
  'HistoryList'
>;
type HistoryRouteProp = RouteProp<MenuStackParamList, 'HistoryList'>;

export function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<HistoryRouteProp>();
  const mainNavigation =
    navigation.getParent<NativeStackNavigationProp<MainParamList>>();
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBack = useCallback(() => {
    if (route.params?.returnTo === 'id') {
      mainNavigation?.reset({
        index: 0,
        routes: [{name: 'ID'}],
      });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [mainNavigation, navigation, route.params?.returnTo]);

  const loadSignatures = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllSignatures();
      console.log('[HistoryScreen] Loaded signatures:', data.length);
      setSignatures(data);
    } catch (error) {
      console.error('[HistoryScreen] Failed to load signatures:', error);
    }
    setLoading(false);
  }, []);

  const groupedSignatures = groupSignaturesByDate(signatures);

  useFocusEffect(
    useCallback(() => {
      loadSignatures();

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
    }, [handleBack, loadSignatures]),
  );

  if (loading && signatures.length === 0) {
    return (
      <View style={commonStyles.screen}>
        <ScreenBackHeader onPress={handleBack} />
        <View style={styles.loadingBody}>
          <Spinner centered />
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.screen}>
      <ScreenBackHeader onPress={handleBack} />

      <ScrollView
        style={commonStyles.screenScroll}
        contentContainerStyle={commonStyles.menuScreenBody}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadSignatures} />
        }
        showsVerticalScrollIndicator={false}>
        {signatures.length === 0 ? (
          <Text style={historyScreenStyles.emptyText}>
            No verifications yet
          </Text>
        ) : (
          <View style={menuScreenStyles.sections}>
            {Array.from(groupedSignatures.entries()).map(
              ([dateLabel, records]) => (
                <MenuSection key={dateLabel} title={dateLabel.toUpperCase()}>
                  {records.map(record => (
                    <SignatureCard key={record.id} record={record} />
                  ))}
                </MenuSection>
              ),
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SignatureStatusIcon({record}: {record: SignatureRecord}) {
  const iconProps = {
    size: menuListIcon.size,
    weight: menuListIcon.weight,
  };

  if (record.success) {
    return <CheckCircleIcon {...iconProps} color={colors.success} />;
  }
  switch (record.failureReason) {
    case 'duplicate':
      return <ArrowsClockwiseIcon {...iconProps} color={colors.warning} />;
    case 'expired':
      return <CalendarXIcon {...iconProps} color={colors.warning} />;
    default:
      return <XCircleIcon {...iconProps} color={colors.error} />;
  }
}

function SignatureCard({record}: {record: SignatureRecord}) {
  const [expanded, setExpanded] = useState(false);
  const status = getSignatureStatusDisplay(record);
  const time = new Date(record.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      style={styles.signatureCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}>
      <View style={styles.signatureHeader}>
        <IconSlot>
          <SignatureStatusIcon record={record} />
        </IconSlot>
        <View style={styles.signatureInfo}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {record.serviceName || 'Verification'}
          </Text>
          <Text style={styles.signatureMeta}>
            {status.shortLabel} · {record.usedIdLabel} · {time}
          </Text>
        </View>
        <IconSlot slotSize={16} style={styles.expandIconSlot}>
          <View style={expanded ? styles.expandIconOpen : undefined}>
            <CaretDownIcon
              size={16}
              color={colors.textMuted}
              weight={menuListIcon.weight}
            />
          </View>
        </IconSlot>
      </View>

      {expanded && (
        <View style={styles.signatureDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{status.detailLabel}</Text>
          </View>
          {record.purpose && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Action</Text>
              <Text style={styles.detailValue}>{record.purpose}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loadingBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureCard: {
    minHeight: 56,
    backgroundColor: colors.surfaceDark,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureInfo: {
    flex: 1,
    minWidth: 0,
  },
  serviceName: {
    ...typography.subtitle3,
    color: colors.text,
  },
  signatureMeta: {
    ...typography.body4,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  expandIconSlot: {
    marginRight: 0,
  },
  expandIconOpen: {
    transform: [{rotate: '180deg'}],
  },
  signatureDetails: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    ...typography.body4,
    color: colors.textMuted,
  },
  detailValue: {
    ...typography.subtitle3,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
});
