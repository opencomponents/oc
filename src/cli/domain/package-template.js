'use strict';

const requireTemplate = require('../../utils/require-template');

module.exports = function(options, callback) {
  const type = options.packageInfo.oc.template.type;
  let ocTemplate;

  try {
    ocTemplate = requireTemplate(type, { compiler: true });
    ocTemplate.compile(options, (err, info) => {
      if (err) {
        return callback(err);
      }
      return callback(null, info);
    });
  } catch (err) {
    return callback(err);
  }
};
