'use strict';

const path = require('path');
const simpleGit = require('simple-git');
const git = simpleGit(path.join(__dirname, '..'));
const format = require('stringformat');
const fs = require('fs');

const utils = {
  formatPrs: commits => {
    const result = [];

    commits.forEach(commit => {
      const commitMessages = commit.message.split('Merge pull request');
      const isPr = commitMessages.length > 1;
      const isSquashedPr = !!commit.message.match(/(.*?)\(#(.*?)\)/g);

      let commitMessage;
      let prNumber;

      if (isPr) {
        const split = commitMessages[1].split('from');

        prNumber = split[0].trim().replace('#', '');
        commitMessage = commit.body;

        result.push(
          format(
            '- [#{0}](https://github.com/opencomponents/oc/pull/{0}) {1}',
            prNumber,
            commitMessage
          )
        );
      } else if (isSquashedPr) {
        const lines = commit.message.split('\n');
        const commitLine = lines[0];
        const prNumberStartIndex = commitLine.lastIndexOf(' (');
        const prNumberEndIndex = commitLine.lastIndexOf(')');

        prNumber = commitLine.substr(
          prNumberStartIndex + 3,
          prNumberEndIndex - prNumberStartIndex - 3
        );
        commitMessage = commitLine.substr(0, prNumberStartIndex).trim();

        result.push(
          format(
            '- [#{0}](https://github.com/opencomponents/oc/pull/{0}) {1}',
            prNumber,
            commitMessage
          )
        );
      }
    });

    return result;
  },
  getFirstCommitHash: cb => {
    git.log(['--reverse'], (err, changes) => {
      if (err) {
        cb(err, null);
      }
      cb(null, changes.latest.hash);
    });
  },
  tagIntervals: (tags, hash) => {
    const logIntervals = [];
    for (let i = tags.length; i > 0; i--) {
      const logInterval = {
        to: tags[i - 1],
        from: hash
      };
      if (i >= 2) {
        logInterval.from = tags[i - 2];
      }
      logIntervals.push(logInterval);
    }
    fs.writeFileSync(
      path.join(__dirname, '../logintervals.md'),
      JSON.stringify(logIntervals)
    );
    return logIntervals;
  }
};

module.exports = {
  // Fetches PRs
  prs: (options, cb) => {
    const opts = Object.assign({}, options, {
      format: {
        message: '%s',
        body: '%b'
      }
    });
    git.log(opts, (err, changes) => {
      if (err) {
        cb(err, null);
      }
      cb(null, utils.formatPrs(changes.all));
    });
  },
  // Fetches all tags
  tags: cb => {
    utils.getFirstCommitHash((err, hash) => {
      git.tags((err, tags) => {
        if (err) {
          cb(err, null);
        }
        cb(null, utils.tagIntervals(tags.all, hash));
      });
    });
  }
};
