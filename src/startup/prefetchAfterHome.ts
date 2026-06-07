import {runPrefetchEmptyHomeDeferred} from './prefetchEmptyHomeDeferred';
import {runPrefetchHomeImmediate} from './prefetchHomeImmediate';
import {runPrefetchStoredHomeDeferred} from './prefetchStoredHomeDeferred';

let tier1Done = false;
let emptyTier2Done = false;
let storedTier2Done = false;

/** Warm icons and lazy screens after the home UI is visible — not on cold start. */
export function prefetchAfterHome(hasStoredId: boolean): void {
  if (!tier1Done) {
    tier1Done = true;
    runPrefetchHomeImmediate();
  }

  setImmediate(() => {
    if (hasStoredId) {
      if (!storedTier2Done) {
        storedTier2Done = true;
        runPrefetchStoredHomeDeferred();
      }
    } else if (!emptyTier2Done) {
      emptyTier2Done = true;
      runPrefetchEmptyHomeDeferred();
    }
  });
}
