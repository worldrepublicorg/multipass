package org.worldrepublic.multipass.qrscanner;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class QrScannerPackage extends BaseReactPackage {
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (name.equals(ServerQrScannerModule.NAME)) {
            return new ServerQrScannerModule(reactContext);
        }
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
            moduleInfos.put(
                ServerQrScannerModule.NAME,
                new ReactModuleInfo(
                    ServerQrScannerModule.NAME,
                    ServerQrScannerModule.NAME,
                    false,
                    false,
                    false,
                    true
                ));
            return moduleInfos;
        };
    }
}
