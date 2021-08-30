'use strict';

const getAvailableDependencies = require('./helpers/get-available-dependencies');

module.exports = function(conf) {
  return function(req, res) {
    if (conf.discovery) {
      const dependencies = getAvailableDependencies(conf.dependencies).map(
        ({ core, name, version }) => {
          const dep = { name, core };
          if (!core && version) {
            // In the future this could be multiple versions
            dep.versions = [version];
          }
          return dep;
        }
      );

      res.status(200).json(dependencies);
    } else {
      res.status(401);
    }
  };
};
