import crypto from 'node:crypto';
import http from 'node:http';
import type { RequestHandler } from 'express';

import strings from '../../resources/';
import type { Authentication, PublishAuthConfig } from '../../types';

const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest();
const safeEqual = (expected: string, actual: string) =>
  typeof expected === 'string' &&
  crypto.timingSafeEqual(sha256(expected), sha256(actual));

const httpError = (status: number) =>
  Object.assign(new Error(http.STATUS_CODES[status]), { status });

function basicAuth(
  isValid: (user: string, pass: string) => boolean
): RequestHandler {
  return (req: any, res, next) => {
    const authorization: string | undefined = req.headers.authorization;

    if (req.user) return next();
    if (authorization) {
      const parts = authorization.split(' ');
      if (parts.length !== 2) return next(httpError(400));

      const [scheme, encoded] = parts;
      const credentials = Buffer.from(encoded, 'base64').toString();
      const index = credentials.indexOf(':');
      if (scheme !== 'Basic' || index < 0) return next(httpError(400));

      const user = credentials.slice(0, index);
      if (isValid(user, credentials.slice(index + 1))) {
        req.user = req.remoteUser = user;
        return next();
      }
    }

    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Authorization Required"');
    res.end('Unauthorized');
  };
}

const basicAuthentication: Authentication<
  | {
      username: string;
      password: string;
    }
  | { logins: Array<{ username: string; password: string }> }
> = {
  validate(authConfig) {
    const logins = 'logins' in authConfig ? authConfig.logins : [authConfig];

    const isValid =
      logins.length > 0 &&
      logins.every((login) => !!login.username && !!login.password);

    return {
      isValid,
      message: isValid
        ? ''
        : strings.errors.registry
            .CONFIGURATION_PUBLISH_BASIC_AUTH_CREDENTIALS_MISSING
    };
  },
  middleware(authConfig) {
    const logins = 'logins' in authConfig ? authConfig.logins : [authConfig];

    return basicAuth((user, pass) =>
      logins.some(
        (login) =>
          safeEqual(login.username, user) && safeEqual(login.password, pass)
      )
    );
  }
};

const builtin: Record<string, Authentication> = {
  basic: basicAuthentication
};

let scheme: Authentication;

export function validate(authConfig: PublishAuthConfig) {
  if (typeof authConfig.type !== 'string') {
    scheme = authConfig.type;
  } else if (builtin[authConfig.type]) {
    scheme = builtin[authConfig.type];
  } else {
    const moduleName = `oc-auth-${authConfig.type}`;

    try {
      scheme = require(moduleName);
    } catch {
      return {
        isValid: false,
        message:
          strings.errors.registry.CONFIGURATION_PUBLISH_AUTH_MODULE_NOT_FOUND(
            moduleName
          )
      };
    }
  }

  return scheme.validate(authConfig);
}

export function middleware(authConfig: unknown): RequestHandler {
  return scheme.middleware(authConfig);
}
