import { NextFunction, Request, Response } from 'express';

export default function discoveryHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.conf.discoveryFunc =
    res.conf.discoveryFunc ||
    (typeof res.conf.discovery === 'function' ? res.conf.discovery : undefined);

  if (res.conf.discoveryFunc) {
    res.conf.discovery = res.conf.discoveryFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }

  next();
}
