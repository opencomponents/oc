import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Component } from '../../types';

const readJsonSync = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

export default function getComponentsByDir() {
  return async (
    componentsDir: string,
    componentsToRun?: string[]
  ): Promise<string[]> => {
    const isOcComponent = (file: string) => {
      const filePath = path.resolve(componentsDir, file);
      const packagePath = path.join(filePath, 'package.json');
      let content: Component;

      try {
        content = readJsonSync(packagePath);
      } catch {
        return false;
      }

      if (!content.oc) {
        return false;
      }

      const packagedProperty = content.oc?.packaged;

      return typeof packagedProperty === 'undefined';
    };

    try {
      let dirContent = await fs.readdir(componentsDir);
      if (componentsToRun) {
        dirContent = dirContent.filter((content) =>
          componentsToRun.includes(content)
        );
      }

      const components = dirContent
        .filter(isOcComponent)
        .map((component) => path.resolve(componentsDir, component));

      return components;
    } catch {
      return [];
    }
  };
}
