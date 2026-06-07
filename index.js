/**
 * @format
 */

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import {setupDefaultFonts} from './src/theme/setupFonts';
import {markStartup} from './src/startup/startupTiming';
import App from './App';

setupDefaultFonts();
import {name as appName} from './app.json';

markStartup('entryReady');

AppRegistry.registerComponent(appName, () => App);
