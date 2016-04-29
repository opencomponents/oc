'use strict';

module.exports = {
  version: {
    options: {
      message: '<%= version %>'
    },
    files: {
      src: ['.']
    }
  },
  changelog: {
    options: {
      message: 'changelog',
    },
    files: {
      src : ['.']
    }
  }
};
