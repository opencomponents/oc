'use strict';

module.exports = {
  package: {
    name: 'async-error-component',
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
          hashKey: 'f59f3942504fee8a5850cdd806172c24964bcf37',
          src: 'server.js'
        }
      }
    }
  },
  data: '"use strict";module.exports.data=function(t,e){setTimeout(function(){e(null,{a:thisDoesnotExist()})},1e3)};',
  view:
    'var oc=oc||{};oc.components=oc.components||{},oc.components["8c1fbd954f2b0d8cd5cf11c885fed4805225749f"]' +
    '=function(){var o=[];return o.push("<div>hello</div>"),o.join("")};'
};
