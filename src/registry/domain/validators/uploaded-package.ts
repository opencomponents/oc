type ValidationResponse =
  | {
      isValid: true;
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
  const returnError = function (message?: string): ValidationResponse {
    return {
      isValid: false,
      message: message || 'uploaded package is not valid'
    };
  };

  if (!input || typeof input !== 'object' || Object.keys(input).length === 0) {
    return returnError('empty');
  }

  if (Object.keys(input).length !== 1) {
    return returnError('not_valid');
  }

  const file: Express.Multer.File = (input as any)[0];
  const validTypes = ['application/gzip', 'application/octet-stream'];

  if (
    !validTypes.includes(file.mimetype) ||
    (file as any).truncated ||
    file.filename.indexOf('.tar.gz') < 0
  ) {
    return returnError('not_valid');
  }

  return { isValid: true };
}
