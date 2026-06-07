import {
  CommonActions,
  createNavigationContainerRef,
} from '@react-navigation/native';

import type {RootStackParamList} from './types';
import type {SessionRequestPayload} from '../services/serverClient';

export const rootNavigationRef =
  createNavigationContainerRef<RootStackParamList>();

/** Leave the verification flow and return to the ID tab home. */
export function exitVerificationToIdHome() {
  if (!rootNavigationRef.isReady()) {
    return;
  }

  rootNavigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{name: 'Main', params: {screen: 'ID'}}],
    }),
  );
}

export function navigateToVerificationRequest(request: SessionRequestPayload) {
  if (!rootNavigationRef.isReady()) {
    throw new Error('Verification flow is not available right now.');
  }

  rootNavigationRef.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [
        {name: 'Main'},
        {
          name: 'Verification',
          state: {
            index: 0,
            routes: [{name: 'ServerCheck', params: {request}}],
          },
        },
      ],
    }),
  );
}
