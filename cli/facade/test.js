'use strict';

var colors = require('colors');
var format = require('../../utils/format');
var fs = require('fs');
var Mocha = require('mocha');

module.exports = function(dependencies){
  
  var logger = dependencies.logger;

  return function(opts){

    var componentPath = opts.componentPath,
        testFilesCount = 0;

    var testRunner = new Mocha({
      timeout: 5000,
      reporter: 'list'
    });

    logger.log('Scanning component for tests...'.yellow);

    fs.readdirSync(componentPath)
      .filter(function(file){ return file === 'test.js';})
      .forEach(function(file){
        testFilesCount++; 
        testRunner.addFile(componentPath + '/' + file); 
      });

    logger.log(format('{0} tests found. Executing test runner...', testFilesCount).yellow);

    testRunner.run(function(failures){
      if(failures){
        process.exit(failures);
      }
    });
  };
};