type ValidationResponse =
  | {
      isValid: true;
      files:
        | Express.Multer.File[]
        | {
            [fieldname: string]: Express.Multer.File[];
          };
    }
  | {
      isValid: false;
      message: string;
    };

export default function uploadedPackage(
  input?:
    | Express.Multer.File[]
    | {
        [fieldname: string]: Express.Multer.File[];
      }
): ValidationResponse {
  const returnError = (message?: string): ValidationResponse => ({
    isValid: false,
    message: message || 'uploaded package is not valid'
  });

  if (!input || typeof input !== 'object' || Object.keys(input).length === 0) {
    return returnError('empty');
  }

  if (Object.keys(input).length !== 1) {
    return returnError('not_valid');
  }

  const file: Express.Multer.File = (input as Express.Multer.File[])[0];
  const validTypes = ['application/gzip', 'application/octet-stream'];

  if (
    !validTypes.includes(file.mimetype) ||
    (file as { truncated?: boolean }).truncated ||
    file.filename.indexOf('.tar.gz') < 0
  ) {
    return returnError('not_valid');
  }

  return { isValid: true, files: input };
}
