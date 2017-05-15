'use strict';

module.exports = {
  options: {
    reporter: '<%= grunt.option("mocha") || "spec" %>'
  },
  acceptance: {
    src: ['test/acceptance/**/*.js']
  },
  integration: {
    src: ['test/integration/**/*.js'],
    options: {
      timeout: 10000
    }
  },
  unit: {
    src: ['test/unit/**/*.js'],
    options: {
      timeout: 5000
    }
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