package org.worldrepublic.multipass.registry;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class RegistryBundledCertsPackage extends BaseReactPackage {
    @Override
    public NativeModule getModule(String name, ReactApplicationContext reactContext) {
        if (name.equals(RegistryBundledCertsModule.NAME)) {
            return new RegistryBundledCertsModule(reactContext);
        }
        return null;
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
            moduleInfos.put(
                RegistryBundledCertsModule.NAME,
                new ReactModuleInfo(
                    RegistryBundledCertsModule.NAME,
                    RegistryBundledCertsModule.NAME,
                    false,
                    false,
                    false,
                    true
                ));
            return moduleInfos;
        };
    }
}
