import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export default function fileUpload(
  req: Request,
  res: Response,
  next: NextFunction
): any {
  if (res.conf.local) {
    return next();
  }

  const normaliseFileName = (x: string) =>
    x.replace('.tar.gz', '').replace(/\W+/g, '-').toLowerCase();

  const upload = multer({
    limits: {
      fieldSize: 10
    },
    storage: multer.diskStorage({
      destination: res.conf.tempDir,
      filename: (_req, file, cb) =>
        cb(null, `${normaliseFileName(file.originalname)}-${Date.now()}.tar.gz`)
    })
  });

  return upload.any()(req, res, next);
}
