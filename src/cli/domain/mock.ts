import fs from 'fs-extra';
import path from 'path';

import settings from '../../resources/settings';

export default function mock() {
  return function(
    params: { targetType: string; targetValue: string; targetName: string },
    callback: (err: Error) => void
  ) {
    fs.readJson(settings.configFile.src, (err, localConfig) => {
      localConfig = localConfig || {};

      const mockType = params.targetType + 's';

      if (!localConfig.mocks) {
        localConfig.mocks = {};
      }

      if (!localConfig.mocks[mockType]) {
        localConfig.mocks[mockType] = {};
      }

      let pluginType = 'static';
      if (fs.existsSync(path.resolve(params.targetValue.toString()))) {
        pluginType = 'dynamic';
      }

      if (!localConfig.mocks[mockType][pluginType]) {
        localConfig.mocks[mockType][pluginType] = {};
      }

      localConfig.mocks[mockType][pluginType][params.targetName] =
        params.targetValue;

      return fs.writeJson(
        settings.configFile.src,
        localConfig,
        { spaces: 2 },
        callback
      );
    });
  };
}
