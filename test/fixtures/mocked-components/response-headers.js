'use strict';

module.exports = {
  package: {
    name: 'response-headers-component',
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
          hashKey: '123456',
          src: 'server.js'
        }
      }
    }
  },
  data: '"use strict";module.exports.data = function(ctx, cb){ctx.setHeader("test-header","test-value"); cb(null, {done:true});};',
  view:
    'var oc=oc||{};oc.components=oc.components||{},oc.components["8c1fbd954f2b0d8cd5cf11c885fed4805225749f"]' +
    '=function(){var o=[];return o.push("<div>hello</div>"),o.join("")};'
};
