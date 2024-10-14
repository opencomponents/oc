import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import settings from '../../resources/settings';

const readJson = (path: string) => fs.readFile(path, 'utf8').then(JSON.parse);
const writeJson = (path: string, data: unknown) =>
  fs.writeFile(path, JSON.stringify(data, null, 2), 'utf-8');

export default function mock() {
  return async (params: {
    targetType: string;
    targetValue: string;
    targetName: string;
  }): Promise<void> => {
    const localConfig = await readJson(settings.configFile.src).catch(
      () => ({})
    );

    const mockType = params.targetType + 's';

    if (!localConfig.mocks) {
      localConfig.mocks = {};
    }

    if (!localConfig.mocks[mockType]) {
      localConfig.mocks[mockType] = {};
    }

    let pluginType = 'static';
    if (existsSync(path.resolve(params.targetValue.toString()))) {
      pluginType = 'dynamic';
    }

    if (!localConfig.mocks[mockType][pluginType]) {
      localConfig.mocks[mockType][pluginType] = {};
    }

    localConfig.mocks[mockType][pluginType][params.targetName] =
      params.targetValue;

    return writeJson(settings.configFile.src, localConfig);
  };
}
