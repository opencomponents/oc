import changelog from './changelog';
import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';

const packageJson = fs.readJsonSync(path.join(__dirname, '..', 'package.json'));

const git = simpleGit(path.join(__dirname, '..'));
const ocVersion = packageJson.version;

git
  .add('.')
  .commit(ocVersion)
  .addAnnotatedTag(`v${ocVersion}`, `Package version upgrade to: ${ocVersion}`)
  .exec(() =>
    changelog().then(() =>
      git
        .add('CHANGELOG.md')
        .commit('changelog')
        .push('origin', 'master', { '--follow-tags': null })
    )
  );
