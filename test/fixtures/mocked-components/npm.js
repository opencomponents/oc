'use strict';

module.exports = {
  package: {
    name: 'npm-component',
    version: '1.0.0',
    dependencies: {
      lodash: ''
    },
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
          hashKey: '6a448d319fd64f46c6cdbad675f9eef09dde2d1b',
          src: 'server.js'
        }
      }
    },
  },
  data: '"use strict";var _=require("lodash");module.exports.data=function(e,r){r(null,{a:_.first(["bye","welcome"])})};',
  view: 'var oc=oc||{};oc.components=oc.components||{},oc.components["8b3650989d66345eea8152e89ec03e1dad8e8e9b"]' +
        '=function(e){var n,o=[],c=e||{};return function(e){o.push("<div>"+jade.escape(null==(n=e)?"":n)+" John  </div>")}.' +
        'call(this,"a"in c?c.a:"undefined"!=typeof a?a:void 0),o.join("")};'
};