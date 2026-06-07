import React, {Suspense} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {IDScreen} from '../screens/id/IDScreen';
import {AddIDIntroScreen} from '../screens/id/AddIDFlow/AddIDIntroScreen';
import {ChipCheckScreen} from '../screens/id/AddIDFlow/ChipCheckScreen';

import type {
  MainParamList,
  IDStackParamList,
  MenuStackParamList,
} from './types';

const IDDetailsScreen = React.lazy(() =>
  import('../screens/id/IDDetailsScreen').then(m => ({
    default: m.IDDetailsScreen,
  })),
);
const MrzScanScreen = React.lazy(() =>
  import('../screens/id/AddIDFlow/MrzScanScreen').then(m => ({
    default: m.MrzScanScreen,
  })),
);
const NfcReadScreen = React.lazy(() =>
  import('../screens/id/AddIDFlow/NfcReadScreen').then(m => ({
    default: m.NfcReadScreen,
  })),
);
const AddIDSuccessScreen = React.lazy(() =>
  import('../screens/id/AddIDFlow/SuccessScreen').then(m => ({
    default: m.AddIDSuccessScreen,
  })),
);
const HistoryScreen = React.lazy(() =>
  import('../screens/menu/HistoryScreen').then(m => ({
    default: m.HistoryScreen,
  })),
);
const MenuScreen = React.lazy(() =>
  import('../screens/menu/MenuScreen').then(m => ({default: m.MenuScreen})),
);

const MainStack = createNativeStackNavigator<MainParamList>();
const IDStack = createNativeStackNavigator<IDStackParamList>();
const MenuStack = createNativeStackNavigator<MenuStackParamList>();

function IDStackNavigator() {
  return (
    <IDStack.Navigator screenOptions={{headerShown: false}}>
      <IDStack.Screen name="IDHome" component={IDScreen} />
      <IDStack.Screen name="IDDetails" component={IDDetailsScreen} />
      <IDStack.Screen name="AddIDIntro" component={AddIDIntroScreen} />
      <IDStack.Screen name="AddIDChipCheck" component={ChipCheckScreen} />
      <IDStack.Screen name="AddIDMrz" component={MrzScanScreen} />
      <IDStack.Screen name="AddIDNfc" component={NfcReadScreen} />
      <IDStack.Screen name="AddIDSuccess" component={AddIDSuccessScreen} />
    </IDStack.Navigator>
  );
}

function MenuStackNavigator() {
  return (
    <MenuStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="MenuHome">
      <MenuStack.Screen name="MenuHome" component={MenuScreen} />
      <MenuStack.Screen name="HistoryList" component={HistoryScreen} />
    </MenuStack.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Suspense fallback={null}>
      <MainStack.Navigator
        screenOptions={{headerShown: false}}
        initialRouteName="ID">
        <MainStack.Screen name="ID" component={IDStackNavigator} />
        <MainStack.Screen name="Menu" component={MenuStackNavigator} />
      </MainStack.Navigator>
    </Suspense>
  );
}
