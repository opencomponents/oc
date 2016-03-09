'use strict';

module.exports = {
  dist : {
    options: {
      owner : 'opentable',
      repository : 'oc',
      file: 'CHANGELOG.md',
      onlyPulls: true,
      useCommitBody: true,
      dateFormat: 'YYYY/MM/DD'
    }
  }
};