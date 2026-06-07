import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertDialog,
  type AlertDialogButton,
  type AlertDialogProps,
} from './AlertDialog';

export type ShowAlertOptions = Pick<
  AlertDialogProps,
  'title' | 'message' | 'icon' | 'buttons'
>;

type AlertDialogContextValue = {
  showAlert: (options: ShowAlertOptions) => void;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

type ActiveAlert = ShowAlertOptions & {visible: boolean};

let showAlertFromModule: ((options: ShowAlertOptions) => void) | null = null;

/** Imperative alerts for async handlers outside React tree hooks. */
export function showAlert(options: ShowAlertOptions): void {
  showAlertFromModule?.(options);
}

export function AlertDialogProvider({children}: {children: React.ReactNode}) {
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const alertIdRef = useRef(0);

  const closeActiveAlert = useCallback(() => {
    setActiveAlert(current =>
      current ? {...current, visible: false} : null,
    );
  }, []);

  const showAlertInProvider = useCallback(
    (options: ShowAlertOptions) => {
      alertIdRef.current += 1;
      const buttons =
        options.buttons?.map(button => ({
          ...button,
          onPress: async () => {
            await button.onPress?.();
            closeActiveAlert();
          },
        })) ?? [{text: 'OK', onPress: closeActiveAlert}];

      setActiveAlert({...options, buttons, visible: true});
    },
    [closeActiveAlert],
  );

  showAlertFromModule = showAlertInProvider;

  const contextValue = useMemo(
    () => ({showAlert: showAlertInProvider}),
    [showAlertInProvider],
  );

  const handleDismiss = useCallback(() => {
    setActiveAlert(null);
  }, []);

  return (
    <AlertDialogContext.Provider value={contextValue}>
      {children}
      {activeAlert ? (
        <AlertDialog
          key={alertIdRef.current}
          visible={activeAlert.visible}
          title={activeAlert.title}
          message={activeAlert.message}
          icon={activeAlert.icon}
          buttons={activeAlert.buttons}
          onOpenChange={open => {
            if (!open) {
              closeActiveAlert();
            }
          }}
          onDismiss={handleDismiss}
        />
      ) : null}
    </AlertDialogContext.Provider>
  );
}

export function useShowAlert(): (options: ShowAlertOptions) => void {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('useShowAlert must be used within AlertDialogProvider');
  }
  return context.showAlert;
}

export type {AlertDialogButton};
