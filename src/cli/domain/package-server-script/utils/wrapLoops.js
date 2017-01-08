'use strict';

var falafel = require('falafel');

var wrapLoops = function(code, CONST_MAX_ITERATIONS){
  var loopKeywords = ['WhileStatement', 'ForStatement', 'DoWhileStatement'];
  return falafel(code, function (node) {
    if(loopKeywords.indexOf(node.type) > -1){
      node.update('{ var __ITER = ' + CONST_MAX_ITERATIONS + ';'
        + node.source() + '}');
    }

    if(!node.parent){
        return;
    }

    if(loopKeywords.indexOf(node.parent.type) > -1 && node.type === 'BlockStatement'){
      node.update('{ if(__ITER <=0){ throw new Error("loop exceeded maximum allowed iterations"); } '
        + node.source() + ' __ITER--; }');
    }
  }).toString();
};

module.exports = wrapLoops;
