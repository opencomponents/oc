import type { OcHandler } from '../domain/http-server/types';

const cors: OcHandler = (_req, res) => {
  res.removeHeader('X-Powered-By');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Allow-Origin', '*');
  res.set(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, traceparent'
  );
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS, PUT, POST');
};

export default cors;
