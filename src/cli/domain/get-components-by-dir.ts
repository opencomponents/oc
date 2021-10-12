import fs from 'fs-extra';
import path from 'path';

export default function getComponentsByDir() {
  return (componentsDir: string, callback: Callback<string[]>): void => {
    const isOcComponent = function(file: string) {
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

    let dirContent: string[];

    try {
      dirContent = fs.readdirSync(componentsDir);
    } catch (err) {
      return callback(null, []);
    }

    const components = dirContent
      .filter(isOcComponent)
      .map(component => path.resolve(componentsDir, component));

    callback(null, components);
  };
}
