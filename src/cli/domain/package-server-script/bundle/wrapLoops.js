'use strict';
var CONST_MAX_ITERATIONS = 10000;

var wrapLoops = function(node){
  var loopKeywords = ['WhileStatement', 'ForStatement', 'DoWhileStatement'];

  if(loopKeywords.indexOf(node.type) > -1){
    node.update('{ var __ITER = ' + CONST_MAX_ITERATIONS + ';'
    + node.source() + '}');
  }

  if(!node.parent){
    return;
  }

  if(loopKeywords.indexOf(node.parent.type) > -1 && node.type === 'BlockStatement') {
    node.update('{ if(__ITER <=0){ throw new Error("loop exceeded maximum allowed iterations"); } '
    + node.source() + ' __ITER--; }');
  }
};

module.exports = wrapLoops;
