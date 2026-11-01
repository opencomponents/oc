export interface Author {
  name?: string;
  email?: string;
  url?: string;
}

const authorRegex =
  /^\s*([^<(]*?)\s*([<(]([^>)]*?)[>)])?\s*([<(]([^>)]*?)[>)])*\s*$/;

export default function parseAuthor(str: string): Author {
  if (typeof str !== 'string') {
    throw new TypeError('expected author to be a string');
  }

  const author: Author = {};
  const match = authorRegex.exec(str);
  if (!/\w/.test(str) || !match) return author;

  if (match[1]) author.name = match[1];

  for (let i = 2; i < match.length; i++) {
    const val = match[i];
    if (i % 2 === 0 && val && match[i + 1]) {
      if (val.charAt(0) === '<') {
        author.email = match[++i];
      } else if (val.charAt(0) === '(') {
        author.url = match[++i];
      }
    }
  }

  return author;
}
