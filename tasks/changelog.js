/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

const async = require('async');
const fs = require('fs');
const path = require('path');
const git = require('./git');

module.exports = () =>
  new Promise((resolve, reject) => {
    const writeChangelog = (changelog, cb) => {
      let result = '## Change Log';
      changelog.forEach(pr => {
        if (pr.changes.length > 0) {
          result += `\n\n### ${pr.tag.to}\n${pr.changes.join('\n')}`;
        }
      });
      fs.writeFile(path.join(__dirname, '../CHANGELOG.md'), result, cb);
    };

    git.tags((err, tags) => {
      const result = [];
      async.eachSeries(
        tags,
        (tag, next) => {
          git.prs(tag, (err, changes) => {
            result.push({
              tag,
              changes
            });
            next(err);
          });
        },
        err => {
          if (err) {
            return reject(err);
          }
          writeChangelog(result, resolve);
        }
      );
    });
  });
