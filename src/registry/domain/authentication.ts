import basicAuth from 'basic-auth-connect';
import { RequestHandler } from 'express';
import path from 'path';

import strings from '../../resources/';

type Validate<T = unknown> = (
  config: T
) => {
  isValid: boolean;
  message: string;
};
type Middleware<T> = (config: T) => any;

type Authentication<T = any> = {
  validate: Validate<T>;
  middleware: Middleware<T>;
};

const basicAuthentication: Authentication<{
  username: string;
  password: string;
}> = {
  validate(authConfig) {
    const isValid = !!authConfig.username && !!authConfig.password;

    return {
      isValid,
      message: isValid
        ? ''
        : strings.errors.registry
            .CONFIGURATION_PUBLISH_BASIC_AUTH_CREDENTIALS_MISSING
    };
  },
  middleware(authConfig) {
    return basicAuth(authConfig.username, authConfig.password);
  }
};

const builtin: Dictionary<Authentication> = {
  basic: basicAuthentication
};

let scheme: Authentication;

export function validate(authConfig: { type: string }) {
  if (builtin[authConfig.type]) {
    scheme = builtin[authConfig.type];
  } else {
    const cwd = process.cwd();
    module.paths.push(cwd, path.join(cwd, 'node_modules'));

    const moduleName = `oc-auth-${authConfig.type}`;

    try {
      scheme = require(moduleName);
    } catch (err) {
      return {
        isValid: false,
        message: strings.errors.registry.CONFIGURATION_PUBLISH_AUTH_MODULE_NOT_FOUND(
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
