'use strict';

var vm = require('vm');

module.exports = {
  template: function(code, template){
    var context = template.type === 'jade' ? { jade: require('jade/runtime.js')} : {};
    vm.runInNewContext(code, context);
    return context.oc.components[template.key];
  }
};