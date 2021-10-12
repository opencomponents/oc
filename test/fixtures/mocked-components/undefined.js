'use strict';

module.exports = {
  package: {
    name: 'undefined-component',
    version: '1.0.0',
    oc: {
      container: false,
      renderInfo: false,
      files: {
        template: {
          type: 'jade',
          hashKey: 'undefined12345',
          src: 'template.js'
        },
        dataProvider: {
          type: 'node.js',
          hashKey: 'undefinedserver12345',
          src: 'server.js'
        }
      }
    }
  },
  data: '"use strict";module.exports.data=function(t,u){u(null);};',
  view:
    'var oc=oc||{};oc.components=oc.components||{},oc.components["undefined12345"]' +
    '=function(){var o=[];return o.push("<div>hello</div>"),o.join("")};'
};
