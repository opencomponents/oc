import { request } from 'undici';

export default async function isUrlDiscoverable(
  url: string
): Promise<{ isDiscoverable: boolean }> {
  try {
    const res = await request(url, { headers: { accept: 'text/html' } });

    const isHtml = !!res.headers['content-type']?.includes('text/html');

    return {
      isDiscoverable: isHtml
    };
  } catch {
    return { isDiscoverable: false };
  }
}
