import {getStoredID, type StoredID} from '../storage/idStorage';

let sharedId: StoredID | null = null;
let sharedIdLoaded = false;
let preloadPromise: Promise<void> | null = null;

export function getStoredIdCache(): {
  id: StoredID | null;
  loaded: boolean;
} {
  return {id: sharedId, loaded: sharedIdLoaded};
}

export function commitStoredIdCache(id: StoredID | null): void {
  sharedId = id;
  sharedIdLoaded = true;
}

async function loadStoredIdFromKeystore(): Promise<void> {
  try {
    sharedId = await getStoredID();
  } catch {
    sharedId = null;
  } finally {
    sharedIdLoaded = true;
  }
}

/** Warm encrypted storage during boot so IDScreen skips a cold keystore read. */
export function preloadStoredID(): Promise<void> {
  if (sharedIdLoaded) {
    return Promise.resolve();
  }
  if (!preloadPromise) {
    preloadPromise = loadStoredIdFromKeystore();
  }
  return preloadPromise;
}

/** Await boot preload — use instead of a second getStoredID while in flight. */
export function waitForStoredIdPreload(): Promise<void> {
  return preloadStoredID();
}
