import path from 'path';
import simpleGit, { ListLogLine, TaskOptions } from 'simple-git';
import fs from 'fs';

const git = simpleGit(path.join(__dirname, '..'));

const utils = {
  formatPrs(
    commits: ReadonlyArray<
      {
        message: string;
        body: string;
      } & ListLogLine
    >
  ) {
    const result: string[] = [];

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
          `- [#${prNumber}](https://github.com/opencomponents/oc/pull/${prNumber}) ${commitMessage}`
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
          `- [#${prNumber}](https://github.com/opencomponents/oc/pull/${prNumber}) ${commitMessage}`
        );
      }
    });

    return result;
  },
  async getFirstCommitHash() {
    const changes = await git.log(['--reserve']);

    return changes!.latest!.hash;
  },
  tagIntervals(tags: string[], hash: string) {
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

export default {
  async prs(options: TaskOptions) {
    const opts = Object.assign({}, options, {
      format: {
        message: '%s',
        body: '%b'
      }
    });
    const changes = await git.log(opts);
    return utils.formatPrs(changes.all);
  },
  async tags() {
    const [hash, tags] = await Promise.all([
      utils.getFirstCommitHash(),
      git.tags()
    ]);

    return utils.tagIntervals(tags.all, hash);
  }
};
