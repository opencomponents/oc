import { NextFunction, Request, Response } from 'express';

export default function baseUrlHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.conf.baseUrlFunc =
    res.conf.baseUrlFunc ||
    (typeof res.conf.baseUrl === 'function' ? res.conf.baseUrl : undefined);

  if (res.conf.baseUrlFunc) {
    res.conf.baseUrl = res.conf.baseUrlFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }

  next();
}
