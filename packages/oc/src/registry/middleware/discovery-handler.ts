import type { OcHandler } from '../domain/http-server/types';

const discoveryHandler: OcHandler = (req, res) => {
  res.conf.discoveryFunc =
    res.conf.discoveryFunc ||
    (typeof res.conf.discovery === 'function' ? res.conf.discovery : undefined);

  if (res.conf.discoveryFunc) {
    res.conf.discovery.ui = res.conf.discoveryFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }
};

export default discoveryHandler;
