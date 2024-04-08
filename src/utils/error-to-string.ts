function hasMessage(obj: unknown): obj is { msg: string } {
  return obj != null && typeof (obj as { msg: string }).msg === 'string';
}

export default function errorToString(err: unknown): string {
  if (typeof err === 'string') {
    return err;
  }
  if (hasMessage(err)) {
    return err.msg;
  }

  return err + '';
}
