import { builtinModules } from 'node:module';

const coreModules: string[] = builtinModules
  .filter((x) => !/^_|^(internal|v8|node-inspect)\/|\//.test(x) && x !== 'sys')
  .sort();

export default coreModules;
