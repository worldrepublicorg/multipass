package org.worldrepublic.multipass.registry;

import android.util.Base64;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import org.worldrepublic.multipass.turbomodules.NativeRegistryBundledCertsSpec;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Reads bundled zkPassport registry certs from APK assets (offline-safe).
 *
 * <p>React Native asset linking may ship {@code mainnet-certs.json} (uncompressed) instead of
 * {@code mainnet-certs.json.gz}; we try several known paths.
 */
public class RegistryBundledCertsModule extends NativeRegistryBundledCertsSpec {
    public static final String NAME = NativeRegistryBundledCertsSpec.NAME;

    private static final String[] ASSET_PATHS = {
        "registry/mainnet-certs.pack",
        "registry/mainnet-certs.json.gz",
        "registry/mainnet-certs.json",
    };

    public RegistryBundledCertsModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public void readGzipBase64(Promise promise) {
        try {
            byte[] bytes = readFirstBundledAsset();
            String encoded = Base64.encodeToString(bytes, Base64.NO_WRAP);
            promise.resolve(encoded);
        } catch (Exception e) {
            promise.reject(
                    "READ_BUNDLED_REGISTRY",
                    "Failed to read bundled registry certificates from assets: "
                            + e.getMessage(),
                    e);
        }
    }

    private byte[] readFirstBundledAsset() throws Exception {
        Exception lastError = null;
        for (String assetPath : ASSET_PATHS) {
            try {
                return readAssetBytes(assetPath);
            } catch (Exception e) {
                lastError = e;
            }
        }
        if (lastError != null) {
            throw lastError;
        }
        throw new Exception("No bundled registry asset paths configured");
    }

    private byte[] readAssetBytes(String assetPath) throws Exception {
        InputStream input = getReactApplicationContext().getAssets().open(assetPath);
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        while ((read = input.read(chunk)) != -1) {
            buffer.write(chunk, 0, read);
        }
        input.close();
        return buffer.toByteArray();
    }
}

