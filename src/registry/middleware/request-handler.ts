'use strict';

import { Request, Response } from 'express';
import { IncomingHttpHeaders } from 'http';
import responseTime from 'response-time';

import * as eventsHandler from '../domain/events-handler';

interface ResponseTimeData {
  body: any;
  duration: number;
  headers: IncomingHttpHeaders;
  method: string;
  path: string;
  relativeUrl: string;
  query: Record<string, any>;
  url: string;
  statusCode: number;
  errorDetails?: string;
  errorCode?: string;
}

export default function requestHandler() {
  return responseTime((req: Request, res: Response, time) => {
    const data: ResponseTimeData = {
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

    if ((res as any).errorDetails) {
      data.errorDetails = (res as any).errorDetails;
    }

    if ((res as any).errorCode) {
      data.errorCode = (res as any).errorCode;
    }

    eventsHandler.fire('request', data);
  });
}
