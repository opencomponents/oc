'use strict';

const packageJson = require('../package');
const path = require('path');
const simpleGit = require('simple-git');
const changelog = require('./changelog');
const git = simpleGit(path.join(__dirname, '..'));

const ocVersion = packageJson.version;

git
  .add('.')
  .commit(ocVersion)
  .addAnnotatedTag(`v${ocVersion}`, `Package version upgrade to: ${ocVersion}`)
  .exec(() =>
    changelog().then(() => git.add('CHANGELOG.md').commit('changelog'))
  )
  .push('origin', 'master', { '--follow-tags': null });
