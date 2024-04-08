import path from 'node:path';
import fs from 'fs-extra';

import settings from '../../resources/settings';

export default function mock() {
  return async (params: {
    targetType: string;
    targetValue: string;
    targetName: string;
  }): Promise<void> => {
    const localConfig = await fs
      .readJson(settings.configFile.src)
      .catch(() => ({}));

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

    return fs.writeJson(settings.configFile.src, localConfig, { spaces: 2 });
  };
}
