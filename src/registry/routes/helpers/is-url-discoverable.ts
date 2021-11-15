import request from 'minimal-request';

export default function isUrlDiscoverable(
  url: string,
  callback: (err: null | null, data: { isDiscoverable: boolean }) => void
): void {
  request(
    {
      url,
      headers: { accept: 'text/html' }
    },
    (err, _body, details) => {
      const isHtml = () =>
        details.response.headers['content-type'].indexOf('text/html') >= 0;

      callback(null, { isDiscoverable: !err && isHtml() });
    }
  );
}
