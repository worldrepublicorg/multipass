import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {ServerCheckScreen} from '../screens/verification/ServerCheckScreen';
import {SessionDetailsScreen} from '../screens/verification/SessionDetailsScreen';
import {VerificationProgressScreen} from '../screens/verification/VerificationProgressScreen';
import {VerificationSuccessScreen} from '../screens/verification/VerificationSuccessScreen';

import type {VerificationStackParamList} from './types';

const Stack = createNativeStackNavigator<VerificationStackParamList>();

export function VerificationNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="ServerCheck" component={ServerCheckScreen} />
      <Stack.Screen name="SessionDetails" component={SessionDetailsScreen} />
      <Stack.Screen
        name="VerificationProgress"
        component={VerificationProgressScreen}
      />
      <Stack.Screen
        name="VerificationSuccess"
        component={VerificationSuccessScreen}
      />
    </Stack.Navigator>
  );
}
