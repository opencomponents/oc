import fs from 'fs-extra';
import path from 'path';
import { Component } from '../../types';

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
        content = fs.readJsonSync(packagePath);
      } catch (err) {
        return false;
      }

      if (!content.oc) {
        return false;
      }

      const packagedProperty = content.oc && content.oc.packaged;

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
    } catch (err) {
      return [];
    }
  };
}
