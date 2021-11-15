import fs from 'fs-extra';
import path from 'path';
import get from './git';

type Result = Array<{
  tag: { to: string; from: string };
  changes: string[];
}>;

export default async () => {
  const writeChangelog = (changelog: Result) => {
    let result = '## Change Log';
    changelog.forEach(pr => {
      if (pr.changes.length > 0) {
        result += `\n\n### ${pr.tag.to}\n${pr.changes.join('\n')}`;
      }
    });
    return fs.writeFile(path.join(__dirname, '../CHANGELOG.md'), result);
  };

  const result: Result = [];
  const tags = await get.tags();

  for (const tag of tags) {
    const changes = await get.prs(tag);
    result.push({
      tag,
      changes
    });
  }

  return writeChangelog(result);
};
