'use strict';

const format = require('stringformat');
const multer = require('multer');

module.exports = function(req, res, next){

  if(res.conf.local){
    return next();
  }

  return multer({
    dest: res.conf.tempDir,
    fieldSize: 10,
    rename: function(fieldname, filename){
      return format('{0}-{1}.tar', filename.replace('.tar', '').replace(/\W+/g, '-').toLowerCase(), Date.now());
    }
  })(req, res, next);
};