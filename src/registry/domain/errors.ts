const UNKNOWN_CODE = 'UNKNOWN';
const UNKNOWN_MESSAGE = 'Unknown error';

interface ErrorLike {
  message?: string;
  code?: string;
  msg?: string;
}

export class OcError extends Error {
  public readonly code: string;

  public static fromError(error: Error) {
    const ocError = new OcError(
      (error as OcError).code || UNKNOWN_CODE,
      error.message
    );
    ocError.stack = error.stack;

    return ocError;
  }

  constructor(code: string, message: string) {
    super(message);

    this.code = code;
    this.name = this.constructor.name;
  }
}

function isOcError(err: unknown): err is OcError {
  return (
    err instanceof OcError || (!!err && (err as OcError).name === OcError.name)
  );
}

function isErrorLike(data: unknown): data is ErrorLike {
  return (
    !!data &&
    (!!(data as ErrorLike).message ||
      !!(data as ErrorLike).msg ||
      !!(data as ErrorLike).code)
  );
}

export function parseError(error: unknown): OcError {
  if (isOcError(error)) return error;

  if (error instanceof Error) {
    return OcError.fromError(error);
  }

  let message = 'Unknown error';
  let code = UNKNOWN_CODE;

  if (isErrorLike(error)) {
    message = error.message || error.msg || UNKNOWN_MESSAGE;
    code = error.code || UNKNOWN_CODE;
  } else if (typeof error === 'string') {
    message = error;
  }

  return new OcError(code, message);
}
