'use strict';

module.exports = {
  package: {
    name: 'error-component',
    version: '1.0.0',
    oc: {
      container: false,
      renderInfo: false,
      files: {
        template: {
          type: 'jade',
          hashKey: '8c1fbd954f2b0d8cd5cf11c885fed4805225749f',
          src: 'template.js'
        },
        dataProvider: {
          type: 'node.js',
          hashKey: 'dd5fea649b80425ff9f6f4d18d6699fe2d210df5',
          src: 'server.js'
        }
      },
      plugins: ['a']
    }
  },
  data: '"use strict";module.exports.data=function(t,u){u(null,{a:t.plugins.a(),b:c()})};',
  view:
    'var oc=oc||{};oc.components=oc.components||{},oc.components["8c1fbd954f2b0d8cd5cf11c885fed4805225749f"]' +
    '=function(){var o=[];return o.push("<div>hello</div>"),o.join("")};'
};
