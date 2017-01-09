'use strict';

var uglifyJs = require('uglify-js');
var format = require('stringformat');
var strings = require('../../../resources');

var compress = function(code, fileName){
  try {
    return uglifyJs.minify(code, { fromString: true }).code;
  } catch (e){
    if(!!e.line && !!e.col){
      throw new Error(format(strings.errors.cli.SERVERJS_PARSING_ERROR, fileName, e.line, e.col, e.message));
    }
    throw e;
  }
};

module.exports = compress;
