import React from 'react';
import type {Icon} from 'phosphor-react-native';
import {
  IdentificationCardIcon,
  LinkBreakIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  QrCodeIcon,
  WarningCircleIcon,
  XCircleIcon,
} from 'phosphor-react-native';

import {showAlert, type ShowAlertOptions} from './AlertDialogProvider';
import {colors} from './styles';

const ALERT_ICON_SIZE = 30;

function createAlertIcon(IconComponent: Icon): React.ReactNode {
  return (
    <IconComponent
      size={ALERT_ICON_SIZE}
      color={colors.textMuted}
      weight="fill"
    />
  );
}

export const alertIcons = {
  error: createAlertIcon(XCircleIcon),
  warning: createAlertIcon(WarningCircleIcon),
  unsupported: createAlertIcon(ProhibitIcon),
  link: createAlertIcon(LinkBreakIcon),
  qr: createAlertIcon(QrCodeIcon),
  id: createAlertIcon(IdentificationCardIcon),
  form: createAlertIcon(PencilSimpleIcon),
};

type SimpleAlertOptions = Pick<
  ShowAlertOptions,
  'title' | 'message' | 'icon' | 'buttons'
>;

export function showSimpleAlert({
  title,
  message,
  icon = alertIcons.error,
  buttons,
}: SimpleAlertOptions): void {
  showAlert({
    title,
    message,
    icon,
    buttons: buttons ?? [{text: 'OK'}],
  });
}
