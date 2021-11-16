import fs from 'fs-extra';
import path from 'path';
import { Component } from '../../types';

export default function getComponentsByDir() {
  return (
    componentsDir: string,
    componentsToRunOrCb:
      | string[]
      | ((err: Error | null, data: string[]) => void),
    callbackMaybe?: (err: Error | null, data: string[]) => void
  ): void => {
    const componentsToRun =
      typeof componentsToRunOrCb === 'function'
        ? undefined
        : componentsToRunOrCb;
    const callback =
      typeof componentsToRunOrCb === 'function'
        ? componentsToRunOrCb
        : callbackMaybe!;

    const isOcComponent = function (file: string) {
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

    let dirContent: string[];

    try {
      dirContent = fs.readdirSync(componentsDir);
      if (componentsToRun) {
        dirContent = dirContent.filter(content =>
          componentsToRun.includes(content)
        );
      }
    } catch (err) {
      return callback(null, []);
    }

    const components = dirContent
      .filter(isOcComponent)
      .map(component => path.resolve(componentsDir, component));

    callback(null, components);
  };
}
