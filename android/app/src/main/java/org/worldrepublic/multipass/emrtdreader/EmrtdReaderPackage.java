package org.worldrepublic.multipass.emrtdreader;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class EmrtdReaderPackage extends BaseReactPackage {
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (name.equals(EmrtdReaderModule.NAME)) {
            return new EmrtdReaderModule(reactContext);
        }
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
            moduleInfos.put(
                EmrtdReaderModule.NAME,
                new ReactModuleInfo(
                    EmrtdReaderModule.NAME,
                    EmrtdReaderModule.NAME,
                    false,
                    false,
                    false,
                    true
                ));
            return moduleInfos;
        };
    }
}
