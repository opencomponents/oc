'use strict';

module.exports = {
  package: {
    name: 'required-parameter-component',
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
          hashKey: '123457',
          src: 'server.js'
        }
      },
      parameters: {
        userId: {
          description: 'The id identifying the user',
          mandatory: true,
          type: 'string'
        }
      }
    }
  },
  data: '"use strict";module.exports.data = function(ctx, cb){cb(null, {done:true});};',
  view:
    'var oc=oc||{};oc.components=oc.components||{},oc.components["8c1fbd954f2b0d8cd5cf11c885fed4805225749f"]' +
    '=function(){var o=[];return o.push("<div>hello</div>"),o.join("")};'
};
