import strings from '../resources';
const UNKNOWN_ERROR_MESSAGE = 'Unknown error';
const UNKNOWN_CODE_ERROR = 'UNKNOWN';

export class OcError extends Error {
  constructor(
    message: string,
    public readonly code = UNKNOWN_CODE_ERROR,
    public readonly status = 500
  ) {
    super(message);
    Object.setPrototypeOf(this, OcError.prototype);
  }

  override toString() {
    return this.message;
  }
}

export class RequireError extends OcError {
  constructor(public readonly missing: string[]) {
    super(
      'Failing requiring dependency',
      strings.errors.registry.DEPENDENCY_NOT_FOUND_CODE
    );
    Object.setPrototypeOf(this, RequireError.prototype);
  }
}

function isObjectLike(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object';
}

export function toOcError(input: unknown): OcError {
  if (input instanceof OcError) return input;
  if (!isObjectLike(input)) return new OcError(UNKNOWN_ERROR_MESSAGE);

  const message =
    typeof input['message'] === 'string'
      ? input['message']
      : UNKNOWN_ERROR_MESSAGE;
  const code = typeof input['code'] === 'string' ? input['code'] : undefined;
  const status =
    typeof input['status'] === 'number' ? input['status'] : undefined;

  return new OcError(message, code, status);
}
