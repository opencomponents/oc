'use strict';

module.exports = {
  client: {
    options: {
      message: 'oc-client <%= version %>'
    },
    files: {
      src: ['.']
    }
  },
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
