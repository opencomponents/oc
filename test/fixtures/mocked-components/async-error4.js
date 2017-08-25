'use strict';

module.exports = {
  package: {
    name: 'async-error4-component',
    version: '1.0.0',
    oc: {
      container: false,
      renderInfo: false,
      files: {
        template: {
          type: 'oc-template-notsupported',
          hashKey: '8c1fbd954f2b0d8cd5cf11c885fed4805225749f',
          src: 'template.js'
        },
        dataProvider: {
          type: 'node.js',
          hashKey: 'bf6318cf5d5f2e7654a750c574fd0db9fb493432',
          src: 'server.js'
        }
      }
    }
  },
  data: '"use strict";module.exports.data=function(r,t){r.params.error?setTimeout(function(){thisDoesnotExist()},1e3):t(null,{error:!!r.params.error})};',
  view: 'var oc=oc||{};oc.components=oc.components||{},oc.components["8c1fbd954f2b0d8cd5cf11c885fed4805225749f"]' +
        '=function(){var o=[];return o.push("<div>hello</div>"),o.join("")};'
};