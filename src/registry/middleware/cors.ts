import type { NextFunction, Request, Response } from 'express';

export default function cors(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.removeHeader('X-Powered-By');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, traceparent'
  );
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT, POST');

  next();
}
