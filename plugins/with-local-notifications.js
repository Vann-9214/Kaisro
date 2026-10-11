const { withAndroidManifest, withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

module.exports = config => {
  config = withAppBuildGradle(config, mod => {
    // Hash long native object paths so Windows builds stay below MAX_PATH.
    if (!mod.modResults.contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      mod.modResults.contents = mod.modResults.contents.replace('defaultConfig {', 'defaultConfig {\n        externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=250" } }');
      mod.modResults.contents = mod.modResults.contents.replace('android {', 'android {\n    externalNativeBuild { cmake { buildStagingDirectory "${rootDir}/../.cxx" } }');
    }
    return mod;
  });
  config = withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    manifest['uses-permission'] ??= [];
    for (const name of ['POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_SPECIAL_USE']) {
      const permission = 'android.permission.' + name;
      if (!manifest['uses-permission'].some(item => item.$['android:name'] === permission)) manifest['uses-permission'].push({ $: { 'android:name': permission } });
    }
    const app = manifest.application[0];
    app.$['android:allowBackup'] = 'false';
    app.service ??= [];
    const name = 'app.notifee.core.ForegroundService';
    let service = app.service.find(item => item.$['android:name'] === name);
    if (!service) { service = { $: { 'android:name': name } }; app.service.push(service); }
    service.$['android:foregroundServiceType'] = 'specialUse';
    service.$['android:exported'] = 'false';
    service.property = [{ $: { 'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE', 'android:value': 'User-enabled local daily task status and reminders' } }];
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'ic_notification.xml'), '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="@android:color/white" android:pathData="M5,3h14v18H5zM7,7v2h10V7zM7,11v2h10v-2zM7,15v2h6v-2z"/></vector>');
    return mod;
  }]);
};
