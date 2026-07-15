const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const workspacePackagesDirectory = `${path.resolve(__dirname, '../../packages')}${path.sep}`;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isWorkspaceSource = context.originModulePath.startsWith(
    workspacePackagesDirectory,
  );
  const isRelativeJavaScriptSpecifier =
    moduleName.endsWith('.js') && /^\.\.?\//.test(moduleName);

  if (isWorkspaceSource && isRelativeJavaScriptSpecifier) {
    const requestedFile = path.resolve(
      path.dirname(context.originModulePath),
      moduleName,
    );

    // Package sources use .js specifiers so their compiled ESM runs in Node.
    // When consuming those sources directly, Metro must resolve the .ts file.
    if (!context.fileSystemLookup(requestedFile).exists) {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
