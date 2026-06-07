import {preloadStoredID} from '../hooks/idState';

/** Kick off keystore read before MainNavigator import (parallel with heavy JS load). */
preloadStoredID();
