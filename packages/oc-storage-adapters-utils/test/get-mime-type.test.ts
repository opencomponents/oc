import { getMimeType } from '../src/get-mime-type';

const scenarios = [
  { ext: '.js', mime: 'application/javascript' },
  { ext: '.css', mime: 'text/css' },
  { ext: '.gif', mime: 'image/gif' },
  { ext: '.jpg', mime: 'image/jpeg' },
  { ext: '.map', mime: 'application/json' },
  { ext: '.png', mime: 'image/png' },
  { ext: '.svg', mime: 'image/svg+xml' },
  { ext: '.html', mime: 'text/html' },
  { ext: '.heisenberg', mime: undefined }
];

scenarios.forEach((scenario) => {
  test(`test ${scenario.ext} extension`, () => {
    expect(getMimeType(scenario.ext)).toBe(scenario.mime);
  });
});
