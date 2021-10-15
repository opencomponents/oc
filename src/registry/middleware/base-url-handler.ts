import { NextFunction, Request, Response } from 'express';

export default function baseUrlHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.conf.baseUrlFunc) {
    res.conf.baseUrl = res.conf.baseUrlFunc({
      host: req.headers.host,
      secure: req.secure
    });
  }

  next();
}
