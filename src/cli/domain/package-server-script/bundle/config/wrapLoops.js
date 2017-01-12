'use strict';


var CONST_MAX_ITERATIONS = require('../../../../../resources/settings').maxLoopIterations;

module.exports = function wrapLoops(node){
  var loopKeywords = ['WhileStatement', 'ForStatement', 'DoWhileStatement'];

  if(loopKeywords.indexOf(node.type) > -1){
    node.update(
      'var __ITER = ' + CONST_MAX_ITERATIONS + ';\n'
      + node.source()
    );
  }

  if(!node.parent){
    return;
  }

  if(loopKeywords.indexOf(node.parent.type) > -1 && node.type === 'BlockStatement'){
    node.update('{ if(__ITER <=0){ throw new Error("loop exceeded maximum '
      + 'allowed iterations"); } '
      + node.source().substr(1).slice(0, -1)
      + ' __ITER--; }'
    );
  }
};
