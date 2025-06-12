import basicAuth from 'basic-auth-connect';
import type { RequestHandler } from 'express';

import strings from '../../resources/';
import type { Authentication, PublishAuthConfig } from '../../types';

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
      logins.some((login) => login.username === user && login.password === pass)
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
    } catch (err) {
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
