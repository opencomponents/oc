import type { OcRequest, OcResponse } from '../domain/http-server/types';

export default function compress(
  data: { uncompressed: string; brotli: Buffer; gzip: Buffer },
  req: OcRequest,
  res: OcResponse
) {
  const accept = req.headers['accept-encoding'];
  const encoding =
    typeof accept === 'string' &&
    (accept.match(/\bbr\b/) || accept.match(/\bgzip\b/) || [])[0];

  if (!encoding) {
    res.send(data.uncompressed);
    return;
  }

  res.set('Content-Encoding', encoding);
  const compressed = encoding === 'br' ? data.brotli : data.gzip;

  res.send(compressed);
}
