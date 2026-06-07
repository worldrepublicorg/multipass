package org.worldrepublic.multipass.qrscanner;

import android.app.Activity;
import android.content.Intent;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import org.worldrepublic.multipass.turbomodules.NativeServerQrScannerSpec;

public class ServerQrScannerModule extends NativeServerQrScannerSpec {
    public static final String NAME = NativeServerQrScannerSpec.NAME;

    public ServerQrScannerModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public void scan(Promise promise) {
        Activity activity = getReactApplicationContext().getCurrentActivity();
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity");
            return;
        }

        QrScanActivity.sCallback = new QrScanActivity.QrCallback() {
            @Override
            public void onQrResult(String payload) {
                WritableMap result = Arguments.createMap();
                result.putString("payload", payload);
                promise.resolve(result);
                QrScanActivity.sCallback = null;
            }

            @Override
            public void onQrError(String error) {
                promise.reject("QR_ERROR", error);
                QrScanActivity.sCallback = null;
            }
        };

        Intent intent = new Intent(activity, QrScanActivity.class);
        activity.startActivity(intent);
    }
}
