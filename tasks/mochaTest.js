'use strict';

module.exports = {
  options: {
    reporter: '<%= grunt.option("mocha") || "spec" %>'
  },
  silent: {
    src: ['test/unit/**/*.js', 'test/integration/**/*.js', 'test/acceptance/**/*.js'],
    options: {
      reporter: 'progress',
      timeout: 20000
    }
  },
  all: {
    src: ['test/unit/**/*.js', 'test/integration/**/*.js', 'test/acceptance/**/*.js'],
    options: {
      timeout: 20000
    }
  }
};
