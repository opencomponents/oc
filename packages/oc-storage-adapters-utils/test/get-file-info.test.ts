import { getFileInfo } from '../src/get-file-info';

const scenarios = [
  {
    path: '/path/file.js',
    gzip: false,
    ext: '.js',
    mime: 'application/javascript'
  },
  {
    path: '/path/file.js.gz',
    gzip: true,
    ext: '.js',
    mime: 'application/javascript'
  },
  { path: 'path/file.css.gz', gzip: true, ext: '.css', mime: 'text/css' },
  {
    path: 'path/file.heisenberg',
    gzip: false,
    ext: '.heisenberg',
    mime: undefined
  }
];

scenarios.forEach((scenario) => {
  test(`test ${scenario.ext} extension`, () => {
    const fileInfo = getFileInfo(scenario.path);
    expect(fileInfo.gzip).toBe(scenario.gzip);
    expect(fileInfo.extname).toBe(scenario.ext);
    expect(fileInfo.mimeType).toBe(scenario.mime);
  });
});
