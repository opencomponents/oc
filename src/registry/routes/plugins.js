'use strict';

module.exports = function(conf) {
  return function(req, res) {
    if (conf.discovery) {
      const plugins = Object.entries(conf.plugins).map(
        ([pluginName, pluginFn]) => ({
          name: pluginName,
          description: pluginFn.toString()
        })
      );

      res.status(200).json(plugins);
    } else {
      res.status(401);
    }
  };
};
