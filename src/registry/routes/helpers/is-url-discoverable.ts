import request from 'minimal-request';

export default function isUrlDiscoverable(
  url: string,
  callback: Callback<{ isDiscoverable: boolean }, null>
): void {
  request(
    {
      url,
      headers: { accept: 'text/html' }
    },
    (err, body, details) => {
      const isHtml = () =>
        details.response.headers['content-type'].indexOf('text/html') >= 0;

      callback(null, { isDiscoverable: !err && isHtml() });
    }
  );
}
