const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const aliases = {
  '@zkpassport/utils/circuits': path.resolve(__dirname, 'node_modules/@zkpassport/utils/dist/esm/circuits/index.js'),
  '@zkpassport/utils/registry': path.resolve(__dirname, 'node_modules/@zkpassport/utils/dist/esm/registry/index.js'),
  'ethers/utils': path.resolve(__dirname, 'node_modules/ethers/lib.esm/utils/index.js'),
  // @peculiar/asn1-* 2.7+ (CJS; avoids Metro export-map + ESM namespace issues)
  '@peculiar/utils/bytes': path.resolve(
    __dirname,
    'node_modules/@peculiar/utils/build/cjs/bytes/index.js',
  ),
  '@peculiar/utils/encoding': path.resolve(
    __dirname,
    'node_modules/@peculiar/utils/build/cjs/encoding/index.js',
  ),
};

const config = {
  resolver: {
    ...defaultConfig.resolver,
    // Subpath imports use explicit aliases above; avoids ESM export-namespace Babel errors
    unstable_enablePackageExports: true,
    resolveRequest: (context, moduleName, platform) => {
      if (aliases[moduleName]) {
        return { filePath: aliases[moduleName], type: 'sourceFile' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
