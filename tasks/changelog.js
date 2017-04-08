'use strict';

var async = require('async');
var format = require('stringformat');
var fs = require('fs');
var path = require('path');
var semverSort = require('semver-sort');
var _ = require('underscore');

module.exports = function(grunt){

  var get = {
    prs: function(versions, callback){
      grunt.util.spawn({
        cmd: 'git',
        args: ['log', versions]
      }, function(err, res){
        if(err){ return callback(err); }
        var commits = res.stdout.split('commit '),
          result = [];

        _.forEach(commits, function(commit){
          var commitMessages = commit.split('Merge pull request'),
            isPr = commitMessages.length > 1,
            isSquashedPr = !!commit.match(/(.*?)\(#(.*?)\)\n(.*?)/g),
            commitMessage,
            prNumber;

          if(isPr){
            var split = commitMessages[1].split('from'),
              branchName = split[1].trim().split(' ')[0].trim();

            prNumber = split[0].trim().replace('#', '');
            commitMessage = split[1].replace(branchName, '').trim();

            result.push(format('- [#{0}](https://github.com/opentable/oc/pull/{0}) {1}', prNumber, commitMessage));
          } else if(isSquashedPr){
            var lines = commit.split('\n'),
              commitLine = lines[4],
              prNumberStartIndex = commitLine.lastIndexOf(' ('),
              prNumberEndIndex = commitLine.lastIndexOf(')');

            prNumber = commitLine.substr(prNumberStartIndex + 3, prNumberEndIndex - prNumberStartIndex - 3);
            commitMessage = commitLine.substr(0, prNumberStartIndex).trim();

            result.push(format('- [#{0}](https://github.com/opentable/oc/pull/{0}) {1}', prNumber, commitMessage));
          }
        });

        callback(null, result);
      });
    },
    allPrs: function(tags, callback){
      var logIntervals = [],
        results = [];

      for(var i = tags.length; i > 0; i--){
        var logInterval = tags[i - 1];
        if(i >= 2){
          logInterval = tags[i - 2] + '..' + logInterval;
        }
        logIntervals.push(logInterval);
      }

      async.eachSeries(logIntervals, function(logInterval, next){
        get.prs(logInterval, function(err, prs){
          results.push(prs);
          next();
        });
      }, function(){
        callback(null, results);
      });
    },
    tags: function(callback){
      grunt.util.spawn({ 
        cmd: 'git', 
        args: ['tag']
      }, function(err, result){
        if(err){ return callback(err); }
        callback(null, result.stdout.split('\n'));
      });
    }
  };

  grunt.registerTask('changelog', 'generates the changelog', function(){

    var done = this.async(),
      result = '## Change Log';

    get.tags(function(err, tags){
      if(err){ return grunt.fatal(err); }

      semverSort.asc(tags);

      get.allPrs(tags, function(err, changes){
        if(err){ return grunt.fatal(err); }

        changes = changes.reverse();

        for(var i = tags.length - 1; i >= 0; i--){
          var changesForTag = changes[i].join('\n');
          if(!_.isEmpty(changesForTag.trim())){
            result += format('\n\n### {0}\n{1}', tags[i], changesForTag);
          }
        }

        fs.writeFileSync(path.join(__dirname, '../CHANGELOG.md'), result);
        done();
      });
    });
  });
};