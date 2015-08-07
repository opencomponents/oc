'use strict';

module.exports = {
  options: {
    reporter: '<%= grunt.option("mocha") || "spec" %>'
  },
  acceptance:{
    src: ['test/acceptance/**/*.js']
  },
  unit:{
    src: ['test/unit/**/*.js']
  }
};