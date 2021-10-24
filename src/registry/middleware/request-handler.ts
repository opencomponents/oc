import { Request, RequestHandler, Response } from 'express';
import responseTime from 'response-time';

import eventsHandler, { RequestData } from '../domain/events-handler';

export default function requestHandler(): RequestHandler {
  return responseTime((req: Request, res: Response, time) => {
    const data: RequestData = {
      body: req.body,
      duration: parseInt(String(time * 1000)),
      headers: req.headers,
      method: req.method,
      path: req.path,
      relativeUrl: req.originalUrl,
      query: req.query,
      url: req.protocol + '://' + req.get('host') + req.originalUrl,
      statusCode: res.statusCode
    };

    if (res.errorDetails) {
      data.errorDetails = res.errorDetails;
    }

    if (res.errorCode) {
      data.errorCode = res.errorCode;
    }

    eventsHandler.fire('request', data);
  });
}
