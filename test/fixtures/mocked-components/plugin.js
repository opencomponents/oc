module.exports = {
  package: {
    name: 'plugin-component',
    version: '1.0.0',
    oc: {
      container: false,
      renderInfo: false,
      files: {
        template: {
          type: 'jade',
          hashKey: '8b3650989d66345eea8152e89ec03e1dad8e8e9b',
          src: 'template.js'
        },
        dataProvider: {
          type: 'node.js',
          hashKey: '6b28f479ae521755c9a4a9ecdd6e552b1e70892d',
          src: 'server.js'
        }
      }
    },
  },
  data: '"use strict";module.exports.data=function(t,n){n(null,{a:t.plugins.doSomething()})};',
  view: 'var oc=oc||{};oc.components=oc.components||{},oc.components["8b3650989d66345eea8152e89ec03e1dad8e8e9b"]' +
        '=function(e){var n,o=[],c=e||{};return function(e){o.push("<div>"+jade.escape(null==(n=e)?"":n)+" John  </div>")}.' +
        'call(this,"a"in c?c.a:"undefined"!=typeof a?a:void 0),o.join("")};'
};