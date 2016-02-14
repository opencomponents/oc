'use strict';

var colors = require('colors/safe');
var read = require('read');

var strings = require('../../resources/index');

module.exports = function(logger, callback){

  logger.log(colors.yellow(strings.messages.cli.ENTER_USERNAME));

  read({}, function(err, username){

    logger.log(colors.yellow(strings.messages.cli.ENTER_PASSWORD));

    read({ silent: true }, function(err, password){
      callback(null, { username: username, password: password});
    });
  });
};