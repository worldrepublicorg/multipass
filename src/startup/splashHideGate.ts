let hideCalled = false;
let resolveHideCalled: (() => void) | null = null;

const hideCalledPromise = new Promise<void>(resolve => {
  resolveHideCalled = resolve;
});

/** Called when RNBootSplash.hide() is invoked (splash becomes visible to user). */
export function markSplashHideCalled(): void {
  if (hideCalled) {
    return;
  }
  hideCalled = true;
  resolveHideCalled?.();
}

export function waitForSplashHideCalled(): Promise<void> {
  return hideCalled ? Promise.resolve() : hideCalledPromise;
}
