'use strict';

module.exports = {
  options: {
    jshintrc: 'tasks/support/.jshintrc',
    ignores: [
      'node_modules',
      'examples/node_modules', 
      'examples/**/_package/',
      'client/src/oc-client.min.js', 
      'src/components/oc-client/src/head.load.js', 
      'src/components/oc-client/src/oc-client.min.js', 
      'src/components/oc-client/_package/**/*', 
      'src/components/base-component-handlebars/_package/**/*',
      'src/components/base-component-pug/_package/**/*',
      'test/fixtures',
      'test/front-end',
      'test/configuration'
    ]
  },
  all: ['.']
};
