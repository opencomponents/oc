import path from 'node:path';
import fs from 'fs-extra';
import { getOcConfig, setOcConfig } from './ocConfig';

export default function mock() {
  return async (params: {
    targetType: 'plugin';
    targetValue: string;
    targetName: string;
  }): Promise<void> => {
    const localConfig = getOcConfig();

    const mockType = `${params.targetType}s` as const;

    if (!localConfig.development[mockType]) {
      localConfig.development[mockType] = {};
    }

    let pluginType: 'static' | 'dynamic' = 'static';
    if (fs.existsSync(path.resolve(params.targetValue.toString()))) {
      pluginType = 'dynamic';
    }

    if (!localConfig.development[mockType][pluginType]) {
      localConfig.development[mockType][pluginType] = {};
    }

    localConfig.development[mockType][pluginType]![params.targetName] =
      params.targetValue;

    return setOcConfig(localConfig);
  };
}
