package org.worldrepublic.multipass.emrtdreader;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.util.Log;
import android.content.Context;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import org.worldrepublic.multipass.turbomodules.NativeEmrtdReaderSpec;

import net.sf.scuba.smartcards.CardService;
import net.sf.scuba.smartcards.CardFileInputStream;
import org.jmrtd.BACKey;
import org.jmrtd.BACKeySpec;
import org.jmrtd.PACEKeySpec;
import org.jmrtd.PassportService;
import org.jmrtd.lds.PACEInfo;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.Security;
import java.util.List;

/**
 * NFC passport/ID reader using JMRTD.
 * Reads raw DG1 + SOD bytes for zkSNARK circuit input.
 * 
 * Best practices implemented:
 * - Extended timeout (15s) for reliable reading
 * - Progress events for UI feedback
 * - Haptic feedback on tag detection
 * - Auto-retry on tag loss during data reading
 * - Detailed error messages for troubleshooting
 */
public class EmrtdReaderModule extends NativeEmrtdReaderSpec
        implements ActivityEventListener, LifecycleEventListener {

    private static final String TAG = "EmrtdReader";
    public static final String NAME = NativeEmrtdReaderSpec.NAME;
    private static final int NFC_TIMEOUT_MS = 15000;
    private static final int MAX_AUTO_RETRIES = 3;
    
    private NfcAdapter nfcAdapter;
    private Promise scanPromise;
    private String documentNumber;
    private String dateOfBirth;
    private String dateOfExpiry;
    private volatile boolean keepWaitingForRetap = false;
    private volatile String readPhase = "idle";
    private volatile long phaseStartMs = 0L;
    private volatile int scanSessionId = 0;
    private volatile IsoDep activeIsoDep = null;
    private volatile int autoRetryCount = 0;
    private volatile boolean readAllDataGroups = false;
    private volatile boolean paceAttempted = false;
    private volatile boolean paceProfilesFound = false;
    private volatile String lastPaceError = null;

    public EmrtdReaderModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(this);
        reactContext.addLifecycleEventListener(this);
        try {
            Security.insertProviderAt(
                new org.spongycastle.jce.provider.BouncyCastleProvider(), 1);
        } catch (Exception e) {
            Log.w(TAG, "BouncyCastle: " + e.getMessage());
        }
    }

    @Override
    public void addListener(String eventName) {
        // Required for NativeEventEmitter with TurboModules.
    }

    @Override
    public void removeListeners(double count) {
        // Required for NativeEventEmitter with TurboModules.
    }

    private void sendProgressEvent(String step, int percent, String message) {
        WritableMap params = Arguments.createMap();
        params.putString("step", step);
        params.putInt("percent", percent);
        params.putString("message", message);
        
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("NfcProgress", params);
        } catch (Exception e) {
            Log.w(TAG, "Failed to send progress event: " + e.getMessage());
        }
    }

    private void vibrateOnTagDetected() {
        try {
            Context context = getReactApplicationContext();
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(100);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Vibration failed: " + e.getMessage());
        }
    }

    private void vibrateOnSuccess() {
        try {
            Context context = getReactApplicationContext();
            Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    long[] pattern = {0, 100, 50, 100};
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    long[] pattern = {0, 100, 50, 100};
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Vibration failed: " + e.getMessage());
        }
    }

    @Override
    public void scan(ReadableMap opts, Promise promise) {
        doScan(opts, promise, false);
    }

    @Override
    public void scanAll(ReadableMap opts, Promise promise) {
        doScan(opts, promise, true);
    }

    private void doScan(ReadableMap opts, Promise promise, boolean readAll) {
        this.scanSessionId += 1;
        this.scanPromise = promise;
        this.documentNumber = opts.getString("documentNumber");
        this.dateOfBirth = opts.getString("dateOfBirth");
        this.dateOfExpiry = opts.getString("dateOfExpiry");
        this.autoRetryCount = 0;
        this.readAllDataGroups = readAll;
        this.paceAttempted = false;
        this.paceProfilesFound = false;
        this.lastPaceError = null;
        Log.d(TAG, "scan() BAC inputs doc=" + this.documentNumber + " dob=" + this.dateOfBirth + " expiry=" + this.dateOfExpiry + " readAll=" + readAll);
        this.keepWaitingForRetap = false;
        this.readPhase = "waiting_for_tag";
        this.phaseStartMs = System.currentTimeMillis();

        Activity activity = getCurrentActivity();
        if (activity == null) { promise.reject("NO_ACTIVITY", "No activity"); return; }

        nfcAdapter = NfcAdapter.getDefaultAdapter(getReactApplicationContext());
        if (nfcAdapter == null) { promise.reject("NO_NFC", "NFC not available on this device"); return; }
        if (!nfcAdapter.isEnabled()) { promise.reject("NFC_OFF", "NFC is disabled. Please enable NFC in your phone settings."); return; }

        sendProgressEvent("waiting", 0, "Hold your phone against the document");
        enableForeground();
    }

    @Override
    public void cancelCurrentScan(Promise promise) {
        this.scanSessionId += 1;
        this.keepWaitingForRetap = false;
        this.readPhase = "cancelled";

        Promise pending = this.scanPromise;
        this.scanPromise = null;

        disableForeground();

        IsoDep isoDep = activeIsoDep;
        activeIsoDep = null;
        if (isoDep != null) {
            try {
                isoDep.close();
            } catch (IOException ignored) {}
        }

        if (pending != null) {
            pending.reject("CANCELLED", "Scan cancelled");
        }
        promise.resolve(null);
    }

    @Override
    public void onNewIntent(Intent intent) {
        if (scanPromise == null) return;
        final int sessionToken = scanSessionId;
        Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
        if (tag == null) return;
        
        vibrateOnTagDetected();
        keepWaitingForRetap = false;
        sendProgressEvent("connecting", 5, "Document detected, connecting...");
        
        new Thread(() -> {
            try {
                readPassport(tag, sessionToken);
            } catch (Exception e) {
                if (!isActiveSession(sessionToken)) return;
                Log.e(TAG, "Read failed at phase " + readPhase, e);
                
                if (shouldAutoRetry(e) && autoRetryCount < MAX_AUTO_RETRIES) {
                    autoRetryCount++;
                    keepWaitingForRetap = true;
                    String retryMsg = "Connection lost. Keep phone still, attempt " + autoRetryCount + "/" + MAX_AUTO_RETRIES;
                    Log.w(TAG, retryMsg);
                    sendProgressEvent("retry", 0, retryMsg);
                    enableForeground();
                } else if (scanPromise != null) {
                    String errorMsg = getDetailedErrorMessage(e);
                    scanPromise.reject("READ_ERROR", errorMsg, e);
                    scanPromise = null;
                }
            } finally {
                if (isActiveSession(sessionToken) && !keepWaitingForRetap) disableForeground();
            }
        }).start();
    }

    private String getDetailedErrorMessage(Exception e) {
        String message = e.getMessage() != null ? e.getMessage() : "Unknown error";
        String full = collectMessages(e);

        if (isPaceOnlyBacFailure(full)) {
            return "This document requires PACE (a newer secure connection) and does not accept the older BAC method. "
                + "We could not complete PACE"
                + (lastPaceError != null ? ": " + lastPaceError : "")
                + ". Hold the phone steady on the chip and try again. If it keeps failing, the card may need a different access key (e.g. CAN) that this app does not support yet.";
        }

        if (message.contains("BAC failed") || message.contains("MUTUAL AUTH")) {
            if (paceProfilesFound && paceAttempted) {
                return "Secure connection (PACE) failed and BAC was rejected by this chip. "
                    + "Verify the MRZ values, hold the phone still on the NFC antenna, and try again.";
            }
            return "Authentication failed. The document number, birth date, or expiry date may be incorrect. Please verify the MRZ data and try again.";
        } else if (message.contains("Tag was lost") || message.contains("transceive") || message.contains("out of date")) {
            return "Connection lost during reading. Please hold your phone steady against the document and don't move until the scan completes.";
        } else if (message.contains("PACE failed")) {
            return "Secure connection failed. Please ensure the document is positioned correctly and try again.";
        } else if (message.contains("timeout") || message.contains("Timeout")) {
            return "The scan timed out. Please ensure the NFC chip is directly under your phone's NFC reader and try again.";
        } else if (message.contains("NOT_ISODEP") || message.contains("ISO14443")) {
            return "This document doesn't appear to have a compatible NFC chip. Please ensure you're scanning a biometric passport or ID card.";
        }
        
        return "NFC read failed: " + message + ". Please try again, keeping your phone steady on the document.";
    }

    private static String collectMessages(Throwable error) {
        StringBuilder sb = new StringBuilder();
        Throwable t = error;
        while (t != null) {
            if (t.getMessage() != null) {
                if (sb.length() > 0) sb.append(" | ");
                sb.append(t.getMessage());
            }
            t = t.getCause();
        }
        return sb.toString();
    }

    private boolean isPaceOnlyBacFailure(String full) {
        boolean keyNotFound = full.contains("KEY NOT FOUND") || full.contains("0x6a88") || full.contains("0x6A88");
        boolean bacFailed = full.contains("BAC failed") || full.contains("MUTUAL AUTH");
        return keyNotFound && bacFailed && (paceProfilesFound || paceAttempted);
    }

    private boolean isActiveSession(int sessionToken) {
        return scanPromise != null && sessionToken == scanSessionId;
    }

    private void readPassport(Tag tag, int sessionToken) throws Exception {
        if (!isActiveSession(sessionToken)) return;
        IsoDep isoDep = IsoDep.get(tag);
        if (isoDep == null) {
            if (isActiveSession(sessionToken)) {
                scanPromise.reject("NOT_ISODEP", "This tag is not compatible. Please use a biometric passport or ID card with NFC chip.");
                scanPromise = null;
            }
            return;
        }
        activeIsoDep = isoDep;
        isoDep.setTimeout(NFC_TIMEOUT_MS);

        CardService cardService = CardService.getInstance(isoDep);
        PassportService service = null;
        try {
            if (!isActiveSession(sessionToken)) return;
            cardService.open();

            service = new PassportService(
                cardService,
                PassportService.NORMAL_MAX_TRANCEIVE_LENGTH,
                PassportService.DEFAULT_MAX_BLOCKSIZE,
                true,
                false);
            service.open();
            if (!isActiveSession(sessionToken)) return;

            BACKeySpec bacKey = new BACKey(documentNumber, dateOfBirth, dateOfExpiry);
            boolean authenticated = performAuthentication(service, bacKey);
            if (!authenticated) {
                throw new IOException("Document authentication failed (PACE and BAC).");
            }

            // Read DG1 (MRZ data)
            setPhase("read_dg1");
            sendProgressEvent("reading_dg1", 40, "Reading personal data...");
            Log.d(TAG, "Reading DG1...");
            byte[] dg1 = readFileWithProgress(service, PassportService.EF_DG1, "DG1", 40, 55);
            Log.d(TAG, "DG1: " + dg1.length + " bytes");

            // Read SOD (Security Object)
            setPhase("read_sod");
            sendProgressEvent("reading_sod", 60, "Reading security data...");
            Log.d(TAG, "Reading SOD...");
            byte[] sod = readFileWithProgress(service, PassportService.EF_SOD, "SOD", 60, 90);
            Log.d(TAG, "SOD: " + sod.length + " bytes");

            // Try to read DG2 (photo) - optional
            byte[] dg2 = null;
            try {
                setPhase("read_dg2");
                sendProgressEvent("reading_photo", 92, "Reading photo (optional)...");
                dg2 = readFileWithProgress(service, PassportService.EF_DG2, "DG2", 92, 98);
                Log.d(TAG, "DG2: " + dg2.length + " bytes");
            } catch (Exception e) {
                Log.w(TAG, "DG2 (photo) not available: " + e.getMessage());
            }

            // Additional data groups for explore mode
            byte[] dg7 = null;  // Signature/mark
            byte[] dg11 = null; // Additional personal details
            byte[] dg12 = null; // Additional document details
            byte[] dg13 = null; // Optional details
            byte[] dg14 = null; // Security options
            byte[] dg15 = null; // Active Authentication public key
            
            if (readAllDataGroups) {
                // DG7 - Displayed signature or mark
                try {
                    setPhase("read_dg7");
                    sendProgressEvent("reading_dg7", 93, "Reading signature (optional)...");
                    dg7 = readFileWithProgress(service, PassportService.EF_DG7, "DG7", 93, 94);
                    Log.d(TAG, "DG7: " + dg7.length + " bytes");
                } catch (Exception e) {
                    Log.w(TAG, "DG7 not available: " + e.getMessage());
                }
                
                // DG11 - Additional personal details
                try {
                    setPhase("read_dg11");
                    sendProgressEvent("reading_dg11", 94, "Reading additional personal details...");
                    dg11 = readFileWithProgress(service, PassportService.EF_DG11, "DG11", 94, 95);
                    Log.d(TAG, "DG11: " + dg11.length + " bytes");
                } catch (Exception e) {
                    Log.w(TAG, "DG11 not available: " + e.getMessage());
                }
                
                // DG12 - Additional document details
                try {
                    setPhase("read_dg12");
                    sendProgressEvent("reading_dg12", 95, "Reading additional document details...");
                    dg12 = readFileWithProgress(service, PassportService.EF_DG12, "DG12", 95, 96);
                    Log.d(TAG, "DG12: " + dg12.length + " bytes");
                } catch (Exception e) {
                    Log.w(TAG, "DG12 not available: " + e.getMessage());
                }
                
                // DG13 - Optional details
                try {
                    setPhase("read_dg13");
                    sendProgressEvent("reading_dg13", 96, "Reading optional details...");
                    dg13 = readFileWithProgress(service, PassportService.EF_DG13, "DG13", 96, 97);
                    Log.d(TAG, "DG13: " + dg13.length + " bytes");
                } catch (Exception e) {
                    Log.w(TAG, "DG13 not available: " + e.getMessage());
                }
                
                // DG14 - Security options (PACE, Chip Auth info)
                try {
                    setPhase("read_dg14");
                    sendProgressEvent("reading_dg14", 97, "Reading security options...");
                    dg14 = readFileWithProgress(service, PassportService.EF_DG14, "DG14", 97, 98);
                    Log.d(TAG, "DG14: " + dg14.length + " bytes");
                } catch (Exception e) {
                    Log.w(TAG, "DG14 not available: " + e.getMessage());
                }
                
                // DG15 - Active Authentication public key
                try {
                    setPhase("read_dg15");
                    sendProgressEvent("reading_dg15", 98, "Reading AA public key...");
                    dg15 = readFileWithProgress(service, PassportService.EF_DG15, "DG15", 98, 99);
                    Log.d(TAG, "DG15: " + dg15.length + " bytes");
                } catch (Exception e) {
                    Log.w(TAG, "DG15 not available: " + e.getMessage());
                }
            }

            // Extract MRZ for display
            String mrz = "";
            if (dg1.length > 5) {
                mrz = new String(dg1, 5, dg1.length - 5, "US-ASCII").trim();
            }

            sendProgressEvent("complete", 100, "Scan complete!");
            vibrateOnSuccess();

            WritableMap result = Arguments.createMap();
            result.putString("dg1", Base64.encodeToString(dg1, Base64.NO_WRAP));
            result.putString("sod", Base64.encodeToString(sod, Base64.NO_WRAP));
            if (dg2 != null) {
                result.putString("dg2", Base64.encodeToString(dg2, Base64.NO_WRAP));
            }
            if (dg7 != null) {
                result.putString("dg7", Base64.encodeToString(dg7, Base64.NO_WRAP));
            }
            if (dg11 != null) {
                result.putString("dg11", Base64.encodeToString(dg11, Base64.NO_WRAP));
            }
            if (dg12 != null) {
                result.putString("dg12", Base64.encodeToString(dg12, Base64.NO_WRAP));
            }
            if (dg13 != null) {
                result.putString("dg13", Base64.encodeToString(dg13, Base64.NO_WRAP));
            }
            if (dg14 != null) {
                result.putString("dg14", Base64.encodeToString(dg14, Base64.NO_WRAP));
            }
            if (dg15 != null) {
                result.putString("dg15", Base64.encodeToString(dg15, Base64.NO_WRAP));
            }
            result.putInt("dg1Length", dg1.length);
            result.putInt("sodLength", sod.length);
            result.putString("mrz", mrz);
            result.putBoolean("fullScan", readAllDataGroups);

            Log.d(TAG, "Read complete: DG1=" + dg1.length + " SOD=" + sod.length);
            
            if (isActiveSession(sessionToken)) {
                scanPromise.resolve(result);
                scanPromise = null;
                readPhase = "done";
                keepWaitingForRetap = false;
                autoRetryCount = 0;
            }
        } finally {
            activeIsoDep = null;
            try { if (service != null) service.close(); } catch (Exception ignored) {}
            try { cardService.close(); } catch (Exception ignored) {}
            try { isoDep.close(); } catch (Exception ignored) {}
        }
    }

    /**
     * PACE-first authentication with BAC fallback. Reads Card Access via FID select (not SFI)
     * and tries every advertised PACE profile before falling back to BAC.
     */
    private boolean performAuthentication(PassportService service, BACKeySpec bacKey) throws Exception {
        setPhase("pace");
        sendProgressEvent("authenticating", 15, "Establishing secure connection (PACE)...");
        paceAttempted = true;

        // Card Access may be readable from the root file system before applet selection.
        List<PACEInfo> paceInfos = EmrtdCardAccessReader.loadPaceInfos(service);
        Log.d(TAG, "PACE profiles (pre-applet): " + paceInfos.size());

        setPhase("select_applet");
        sendProgressEvent("selecting", 10, "Selecting passport application...");
        Log.d(TAG, "Selecting eMRTD applet...");
        service.sendSelectApplet(false);
        Log.d(TAG, "eMRTD applet selected");

        if (paceInfos.isEmpty()) {
            paceInfos = EmrtdCardAccessReader.loadPaceInfos(service);
            Log.d(TAG, "PACE profiles (post-applet): " + paceInfos.size());
        }

        paceProfilesFound = !paceInfos.isEmpty();
        if (paceProfilesFound) {
            PACEKeySpec paceKey = PACEKeySpec.createMRZKey(bacKey);
            for (int i = 0; i < paceInfos.size(); i++) {
                PACEInfo pi = paceInfos.get(i);
                String oid = pi.getObjectIdentifier();
                String mapping = PACEInfo.toMappingType(oid).toString();
                Log.d(TAG, "Trying PACE profile " + (i + 1) + "/" + paceInfos.size()
                    + " oid=" + oid + " mapping=" + mapping + " paramId=" + pi.getParameterId());
                try {
                    service.doPACE(
                        paceKey,
                        oid,
                        PACEInfo.toParameterSpec(pi.getParameterId()),
                        pi.getParameterId());
                    Log.d(TAG, "PACE OK with profile " + (i + 1));
                    sendProgressEvent("authenticated", 25, "Secure connection established");
                    service.sendSelectApplet(true);
                    Log.d(TAG, "eMRTD applet re-selected with secure messaging");
                    return true;
                } catch (Exception e) {
                    lastPaceError = e.getMessage();
                    Log.w(TAG, "PACE profile " + (i + 1) + " failed: " + lastPaceError);
                }
            }
            Log.w(TAG, "All " + paceInfos.size() + " PACE profile(s) failed");
        } else {
            Log.d(TAG, "No PACE profiles in Card Access / Card Security; will try BAC");
        }

        setPhase("bac");
        sendProgressEvent("authenticating", 15, "Authenticating with document (BAC)...");
        Log.d(TAG, "Trying BAC...");
        try {
            service.doBAC(bacKey);
            Log.d(TAG, "BAC OK");
            sendProgressEvent("authenticated", 25, "Authentication successful");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "BAC failed", e);
            throw e;
        }
    }

    private byte[] readFileWithProgress(PassportService service, short fid, String name, int startPercent, int endPercent) throws Exception {
        CardFileInputStream in = service.getInputStream(fid);
        int fileLength = in.getLength();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[256];
        int len;
        int total = 0;
        long lastProgressUpdate = System.currentTimeMillis();
        
        try {
            while ((len = in.read(buf)) > 0) {
                out.write(buf, 0, len);
                total += len;
                
                long now = System.currentTimeMillis();
                if (now - lastProgressUpdate >= 200) {
                    int progress = startPercent;
                    if (fileLength > 0) {
                        progress = startPercent + (int)((endPercent - startPercent) * ((float)total / fileLength));
                    }
                    String msg = "Reading " + name + "... " + (total / 1024) + " KB";
                    sendProgressEvent("reading_" + name.toLowerCase(), progress, msg);
                    lastProgressUpdate = now;
                }
            }
            Log.d(TAG, name + " read finished: " + total + " bytes");
            return out.toByteArray();
        } catch (Exception e) {
            throw new Exception("Failed reading " + name + " after " + total + " bytes: " + e.getMessage(), e);
        }
    }

    private void enableForeground() {
        try {
            Activity activity = getCurrentActivity();
            if (activity == null || nfcAdapter == null) return;
            
            Intent intent = new Intent(activity, activity.getClass());
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            
            PendingIntent pi = PendingIntent.getActivity(
                activity, 0, intent,
                PendingIntent.FLAG_MUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            
            String[][] techList = new String[][] {
                new String[] { IsoDep.class.getName() }
            };
            
            nfcAdapter.enableForegroundDispatch(activity, pi, null, techList);
            Log.d(TAG, "Waiting for passport NFC tag...");
        } catch (Exception e) {
            Log.w(TAG, "enableForeground failed: " + e.getMessage());
        }
    }

    private void disableForeground() {
        try {
            Activity activity = getCurrentActivity();
            if (activity != null && nfcAdapter != null) {
                nfcAdapter.disableForegroundDispatch(activity);
            }
        } catch (Exception e) { /* ignore */ }
    }

    private void setPhase(String phase) {
        readPhase = phase;
        phaseStartMs = System.currentTimeMillis();
    }

    private boolean shouldAutoRetry(Throwable error) {
        String message = error != null && error.getMessage() != null ? error.getMessage() : "";
        Throwable cause = error != null ? error.getCause() : null;
        while (cause != null) {
            if (cause.getMessage() != null) message += " | " + cause.getMessage();
            if (cause instanceof java.lang.SecurityException && message.contains("out of date")) break;
            cause = cause.getCause();
        }
        
        boolean tagLost = message.contains("out of date") || 
                          message.contains("Read binary failed") || 
                          message.contains("Tag (") ||
                          message.contains("transceive failed") ||
                          message.contains("Tag was lost");
                          
        boolean retryablePhase = "read_dg1".equals(readPhase) || 
                                  "read_sod".equals(readPhase) || 
                                  "read_dg2".equals(readPhase) ||
                                  "pace".equals(readPhase) ||
                                  "bac".equals(readPhase);
                                  
        if (tagLost && retryablePhase) {
            Log.w(TAG, "Auto-retry NFC after phase=" + readPhase + " attempt=" + autoRetryCount + " msg=" + message);
            return true;
        }
        return false;
    }

    @Override public void onActivityResult(Activity a, int q, int r, Intent d) {}

    @Override
    public void onHostResume() {
        Activity activity = getCurrentActivity();
        if (activity != null && nfcAdapter != null && scanPromise != null) {
            enableForeground();
        }
    }

    @Override
    public void onHostPause() { disableForeground(); }

    @Override public void onHostDestroy() {}
}
