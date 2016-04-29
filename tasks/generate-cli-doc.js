'use strict';

var fs = require('fs-extra');
var path = require('path');

var commandsParser = require('./support/cli-commands-parser');

module.exports = function(grunt){

  grunt.registerTask('generate-cli-doc', 'Automatically updates the cli.md file', function(){

    var parsed = commandsParser.parse(),
        data = fs.readFileSync(path.join(__dirname, 'support/cli-template.md'), 'utf8'),
        newFileData = data.replace('[commands-shortlist]', parsed.commandList).replace('[commands-detailed]', parsed.detailedCommandList);

    fs.writeFileSync(path.join(__dirname, '../docs/cli.md'), newFileData);
  });
};