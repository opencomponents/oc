'use strict';

var zlib = require('zlib');
var fs = require('fs-extra');

module.exports = function(input, output, callback){
  var gzip = zlib.createGzip();
  var inp = fs.createReadStream(input);
  var out = fs.createWriteStream(output);
  out.on('error', callback);
  out.on('finish', callback);
  inp.on('error', callback);
  inp.pipe(gzip).pipe(out);
};
