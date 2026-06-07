const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

function getSubstTarget(driveLetter) {
  if (process.platform !== 'win32' || !driveLetter) {
    return null;
  }
  try {
    const letter = driveLetter.replace(/:$/, '').charAt(0).toUpperCase();
    const output = execSync('subst', {encoding: 'utf8'});
    for (const line of output.split(/\r?\n/)) {
      const match = line.match(/^([A-Z]):\\:\s*=>\s*(.+)$/i);
      if (match && match[1].toUpperCase() === letter) {
        return match[2].trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}

function resolveMetroProjectRoot(configDir) {
  if (process.env.REACT_NATIVE_PHYSICAL_ROOT) {
    return path.resolve(process.env.REACT_NATIVE_PHYSICAL_ROOT);
  }

  const substTarget = getSubstTarget(configDir);
  if (substTarget) {
    return substTarget;
  }

  try {
    return fs.realpathSync.native(configDir);
  } catch {
    try {
      return fs.realpathSync(configDir);
    } catch {
      return path.resolve(configDir);
    }
  }
}

const projectRoot = resolveMetroProjectRoot(__dirname);
const defaultConfig = getDefaultConfig(projectRoot);
const aliases = {
  '@zkpassport/utils/circuits': path.resolve(
    projectRoot,
    'node_modules/@zkpassport/utils/dist/esm/circuits/index.js',
  ),
  '@zkpassport/utils/registry': path.resolve(
    projectRoot,
    'node_modules/@zkpassport/utils/dist/esm/registry/index.js',
  ),
  // @peculiar/asn1-* 2.7+ (CJS; avoids Metro export-map + ESM namespace issues)
  '@peculiar/utils/bytes': path.resolve(
    projectRoot,
    'node_modules/@peculiar/utils/build/cjs/bytes/index.js',
  ),
  '@peculiar/utils/encoding': path.resolve(
    projectRoot,
    'node_modules/@peculiar/utils/build/cjs/encoding/index.js',
  ),
};

const config = {
  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    ...defaultConfig.resolver,
    assetExts: [...(defaultConfig.resolver.assetExts || []), 'gz'],
    // Subpath imports use explicit aliases above; avoids ESM export-namespace Babel errors
    unstable_enablePackageExports: true,
    resolveRequest: (context, moduleName, platform) => {
      if (aliases[moduleName]) {
        return {filePath: aliases[moduleName], type: 'sourceFile'};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
