import { NextFunction, Request, Response } from 'express';

export default function cors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.removeHeader('X-Powered-By');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT, POST');

  next();
}
