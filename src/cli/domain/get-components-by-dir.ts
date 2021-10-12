import fs from 'fs-extra';
import path from 'path';

export default function getComponentsByDir() {
  return async (componentsDir: string): Promise<string[]> => {
    const isOcComponent = (file: string) => {
      const filePath = path.resolve(componentsDir, file),
        packagePath = path.join(filePath, 'package.json');
      let content;

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
      const dirContent = await fs.readdir(componentsDir);

      const components = dirContent
        .filter(isOcComponent)
        .map(component => path.resolve(componentsDir, component));

      return components;
    } catch (err) {
      return [];
    }
  };
}
