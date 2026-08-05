const { withGradleProperties, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withCustomGradleProperties(config) {
  config = withGradleProperties(config, (config) => {
    
    const propertiesToUpdate = {
      'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1024m',
      'kotlin.daemon.jvm.options': '-Xmx2048m',
      'reactNativeArchitectures': 'arm64-v8a',
    };

    for (const [key, value] of Object.entries(propertiesToUpdate)) {
      // Remove any existing property with the same key to avoid duplicates
      config.modResults = config.modResults.filter(item => item.type === 'property' && item.key !== key);
      
      // Add the new custom property
      config.modResults.push({
        type: 'property',
        key: key,
        value: value
      });
    }

    return config;
  });

  // 2. Modifying local.properties to inject sdk.dir automatically
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const localPropertiesPath = path.join(config.modRequest.platformProjectRoot, 'local.properties');
      // Using forward slashes or double backslashes works, standard properties file escapes backslashes
      const sdkDir = 'sdk.dir=C:\\\\Users\\\\gamin\\\\AppData\\\\Local\\\\Android\\\\Sdk';
      
      let currentContent = '';
      if (fs.existsSync(localPropertiesPath)) {
        currentContent = fs.readFileSync(localPropertiesPath, 'utf8');
      }

      if (!currentContent.includes('sdk.dir=')) {
        fs.writeFileSync(localPropertiesPath, currentContent + '\n' + sdkDir + '\n');
      }
      
      return config;
    },
  ]);

  return config;
};
