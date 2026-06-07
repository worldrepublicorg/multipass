package org.worldrepublic.multipass.mrzscanner;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import org.worldrepublic.multipass.turbomodules.NativeMrzScannerSpec;

/**
 * TurboModule — launches MrzScanActivity and returns the MRZ result.
 */
public class MrzScannerModule extends NativeMrzScannerSpec {
    private static final String TAG = "MrzScanner";

    public static final String NAME = NativeMrzScannerSpec.NAME;

    public MrzScannerModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public void scan(Promise promise) {
        Activity activity = getReactApplicationContext().getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity");
            return;
        }

        MrzScanActivity.sCallback = new MrzScanActivity.MrzCallback() {
            @Override
            public void onMrzResult(String docNum, String dob, String expiry) {
                Log.d(TAG, "MRZ parsed doc=" + docNum + " dob=" + dob + " expiry=" + expiry);
                WritableMap result = Arguments.createMap();
                result.putString("documentNumber", docNum);
                result.putString("dateOfBirth", dob);
                result.putString("dateOfExpiry", expiry);
                promise.resolve(result);
                MrzScanActivity.sCallback = null;
            }

            @Override
            public void onMrzError(String error) {
                promise.reject("MRZ_ERROR", error);
                MrzScanActivity.sCallback = null;
            }
        };

        Intent intent = new Intent(activity, MrzScanActivity.class);
        activity.startActivity(intent);
    }
}
