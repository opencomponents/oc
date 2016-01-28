'use strict';

var fs = require('fs-extra');
var path = require('path');

var commandsParser = require('./cli-commands-parser');

module.exports = function(){

  var parsed = commandsParser.parse(),
      data = fs.readFileSync(path.join(__dirname, 'cli-template.md'), 'utf8'),
      newFileData = data.replace('[commands-shortlist]', parsed.commandList).replace('[commands-detailed]', parsed.detailedCommandList);

  fs.writeFileSync(path.join(__dirname, '../../docs/cli.md'), newFileData);
};