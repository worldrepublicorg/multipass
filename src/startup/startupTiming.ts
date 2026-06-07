/**
 * Cold-start timing marks. Logged in debug and release (see logcat ReactNativeJS).
 *
 * User-visible startup ends at `splashHideCalled` (RNBootSplash.hide() invoked).
 * `splashHidden` is when the hide promise settles on JS — often much later if the
 * thread is busy with prefetch; it is not the native fade duration.
 *
 * Release cold start + logcat:
 *   adb shell am force-stop org.worldrepublic.multipass
 *   adb logcat -c && adb logcat *:S ReactNativeJS:V
 *   adb shell am start -n org.worldrepublic.multipass/.MainActivity
 *
 * Native-only (does not include JS):
 *   adb shell am start -W -S -n org.worldrepublic.multipass/.MainActivity
 */
const marks: Record<string, number> = {};
let originMs: number | null = null;

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function phaseMs(from: string, to: string): number | null {
  const a = marks[from];
  const b = marks[to];
  if (a == null || b == null) {
    return null;
  }
  return Math.round(b - a);
}

function logPhaseSummary(): void {
  const jsLoad = phaseMs('entryReady', 'firstRender');
  const navMount = phaseMs('firstRender', 'navigationReady');
  const navToHideCall = phaseMs('navigationReady', 'splashHideCalled');
  const total = phaseMs('appModule', 'splashHideCalled');
  const postHideJsWork = phaseMs('splashHideCalled', 'splashHidden');

  const parts: string[] = [];
  if (jsLoad != null) {
    parts.push(`jsLoad=${jsLoad}ms`);
  }
  if (navMount != null) {
    parts.push(`navMount=${navMount}ms`);
  }
  if (navToHideCall != null) {
    parts.push(`navToHideCall=${navToHideCall}ms`);
  }
  if (total != null) {
    parts.push(`total=${total}ms`);
  }
  if (postHideJsWork != null) {
    parts.push(`postHideJsWork=${postHideJsWork}ms`);
  }
  if (parts.length > 0) {
    console.log(`[startup] summary ${parts.join(' ')}`);
  }
}

export function markStartup(label: string): void {
  const t = nowMs();
  if (originMs === null) {
    originMs = t;
  }
  marks[label] = t;

  console.log(`[startup] ${label} +${Math.round(t - originMs)}ms`);

  if (label === 'splashHidden') {
    logPhaseSummary();
  }
}
