'use strict';

const async = require('async');
const format = require('stringformat');
const fs = require('fs');
const path = require('path');
const semverSort = require('semver-sort');
const _ = require('lodash');

module.exports = function(grunt){

  const get = {
    prs: function(versions, callback){
      grunt.util.spawn({
        cmd: 'git',
        args: ['log', versions]
      }, (err, res) => {
        if(err){ return callback(err); }
        const commits = res.stdout.split('commit '),
          result = [];

        _.forEach(commits, (commit) => {
          const commitMessages = commit.split('Merge pull request'),
            isPr = commitMessages.length > 1,
            isSquashedPr = !!commit.match(/(.*?)\(#(.*?)\)\n(.*?)/g);
          let commitMessage,
            prNumber;

          if(isPr){
            const split = commitMessages[1].split('from'),
              branchName = split[1].trim().split(' ')[0].trim();

            prNumber = split[0].trim().replace('#', '');
            commitMessage = split[1].replace(branchName, '').trim();

            result.push(format('- [#{0}](https://github.com/opentable/oc/pull/{0}) {1}', prNumber, commitMessage));
          } else if(isSquashedPr){
            const lines = commit.split('\n'),
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
      const logIntervals = [],
        results = [];

      for(let i = tags.length; i > 0; i--){
        let logInterval = tags[i - 1];
        if(i >= 2){
          logInterval = tags[i - 2] + '..' + logInterval;
        }
        logIntervals.push(logInterval);
      }

      async.eachSeries(logIntervals, (logInterval, next) => {
        get.prs(logInterval, (err, prs) => {
          results.push(prs);
          next();
        });
      }, () => {
        callback(null, results);
      });
    },
    tags: function(callback){
      grunt.util.spawn({
        cmd: 'git',
        args: ['tag']
      }, (err, result) => {
        if(err){ return callback(err); }
        callback(null, result.stdout.split('\n'));
      });
    }
  };

  grunt.registerTask('changelog', 'generates the changelog', function(){

    const done = this.async();
    let result = '## Change Log';

    get.tags((err, tags) => {
      if(err){ return grunt.fatal(err); }

      semverSort.asc(tags);

      get.allPrs(tags, (err, changes) => {
        if(err){ return grunt.fatal(err); }

        changes = changes.reverse();

        for(let i = tags.length - 1; i >= 0; i--){
          const changesForTag = changes[i].join('\n');
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
