import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {NavigatorScreenParams} from '@react-navigation/native';
import type {SessionRequestPayload} from '../services/serverClient';

export type MainParamList = {
  ID: NavigatorScreenParams<IDStackParamList> | undefined;
  Menu: NavigatorScreenParams<MenuStackParamList> | undefined;
};

export type IDStackParamList = {
  IDHome: undefined;
  IDDetails: {id: string};
  AddIDIntro: undefined;
  AddIDChipCheck: undefined;
  AddIDMrz: undefined;
  AddIDNfc: {documentNumber: string; dateOfBirth: string; dateOfExpiry: string};
  AddIDSuccess: {id: string};
};

export type MenuStackParamList = {
  MenuHome: undefined;
  HistoryList: {returnTo?: 'id'} | undefined;
};

export type VerificationStackParamList = {
  ServerCheck: {request: SessionRequestPayload};
  SessionDetails: {request: SessionRequestPayload};
  VerificationProgress: {request: SessionRequestPayload};
  VerificationSuccess: {
    request: SessionRequestPayload;
    durationMs: number;
  };
};

export type RootStackParamList = {
  Boot: undefined;
  Main: NavigatorScreenParams<MainParamList>;
  Verification: NavigatorScreenParams<VerificationStackParamList>;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainScreenProps<T extends keyof MainParamList> =
  NativeStackScreenProps<MainParamList, T>;

export type IDStackScreenProps<T extends keyof IDStackParamList> =
  NativeStackScreenProps<IDStackParamList, T>;

export type VerificationStackScreenProps<
  T extends keyof VerificationStackParamList,
> = NativeStackScreenProps<VerificationStackParamList, T>;

export type MenuStackScreenProps<T extends keyof MenuStackParamList> =
  NativeStackScreenProps<MenuStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
