import type { OcHandler } from '../domain/http-server/types';

const baseUrlHandler: OcHandler = (req, res) => {
  if (res.conf.baseUrlFunc) {
    res.conf.baseUrl = res.conf.baseUrlFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }
};

export default baseUrlHandler;
