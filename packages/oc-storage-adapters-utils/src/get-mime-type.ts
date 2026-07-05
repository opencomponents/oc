export function getMimeType(extension: string) {
  return {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.map': 'application/json',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.html': 'text/html'
  }[extension];
}
