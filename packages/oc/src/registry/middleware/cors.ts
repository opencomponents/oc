import type { NextFunction, Request, Response } from 'express';

export default function cors(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.removeHeader('X-Powered-By');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Origin', '*');
  res.set(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, traceparent'
  );
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT, POST');

  next();
}
