'use strict';

const async = require('async');
const format = require('stringformat');
const fs = require('fs');
const path = require('path');
const get = require('./git');

module.exports = () =>
  new Promise(resolve => {
    const writeChangelog = changelog => {
      let result = '## Change Log';
      changelog.forEach(pr => {
        if (pr.changes.length > 0) {
          result += format(
            '\n\n### {0}\n{1}',
            pr.tag.to,
            pr.changes.join('\n')
          );
        }
      });
      fs.writeFileSync(path.join(__dirname, '../CHANGELOG.md'), result);
    };

    get.tags((err, tags) => {
      const result = [];
      async.eachSeries(
        tags,
        (tag, next) => {
          get.prs(tag, (err, changes) => {
            result.push({
              tag,
              changes
            });
            next();
          });
        },
        () => {
          writeChangelog(result);
          resolve();
        }
      );
    });
  });
