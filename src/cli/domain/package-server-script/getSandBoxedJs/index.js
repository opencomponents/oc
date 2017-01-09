'use strict';

var _ = require('underscore');
var wrapLoops = require('./wrapLoops');
var compress = require('../compress');


var getSandBoxedJs = function(wrappedRequires, serverContent, fileName, maxLoopIterations){
  if(_.keys(wrappedRequires).length > 0){
    serverContent = 'var __sandboxedRequire = require, ' +
                    '    __localRequires=' + JSON.stringify(wrappedRequires) + ';' +
                    'require=function(x){' +
                    '  return __localRequires[x] ? __localRequires[x] : __sandboxedRequire(x);' +
                    '};' +
                    '\n' + serverContent;
  }

  return compress(wrapLoops(serverContent, maxLoopIterations), fileName);
};

module.exports = getSandBoxedJs;
