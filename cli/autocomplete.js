'use strict';

var omelette = require('omelette');
var complete = omelette('oc <action>');

module.exports = {
  init: function(commands){
    complete.on('action', function(){
      this.reply(commands.sort());
    });

    complete.init();
  },
  setup: function(){
    complete.setupShellInitFile();
  }
};
