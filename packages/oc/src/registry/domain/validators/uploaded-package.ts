import type { UploadedFile } from '../http-server/types';

type ValidationResponse =
  | {
      isValid: true;
      files:
        | UploadedFile[]
        | {
            [fieldname: string]: UploadedFile[];
          };
    }
  | {
      isValid: false;
      message: string;
    };

export default function uploadedPackage(
  input?:
    | UploadedFile[]
    | {
        [fieldname: string]: UploadedFile[];
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

  const file: UploadedFile = (input as UploadedFile[])[0];
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
