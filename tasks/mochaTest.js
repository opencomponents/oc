'use strict';

module.exports = {
  options: {
    reporter: '<%= grunt.option("mocha") || "spec" %>'
  },
  acceptance: {
    src: ['test/acceptance/**/*.js']
  },
  integration: {
    src: ['test/integration/**/*.js']
  },
  unit: {
    src: ['test/unit/**/*.js']
  },
  silent: {
    src: ['test/unit/**/*.js', 'test/integration/**/*.js', 'test/acceptance/**/*.js'],
    options: {
      reporter: 'progress'
    }
  },
  all: {
    src: ['test/unit/**/*.js', 'test/integration/**/*.js', 'test/acceptance/**/*.js']
  }
};