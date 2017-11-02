'use strict';

const multer = require('multer');

module.exports = function(req, res, next) {
  if (res.conf.local) {
    return next();
  }

  const normaliseFileName = x =>
    x
      .replace('.tar.gz', '')
      .replace(/\W+/g, '-')
      .toLowerCase();

  const upload = multer({
    limits: {
      fieldSize: 10
    },
    storage: multer.diskStorage({
      destination: res.conf.tempDir,
      filename: (req, file, cb) =>
        cb(null, `${normaliseFileName(file.originalname)}-${Date.now()}.tar.gz`)
    })
  });

  return upload.any()(req, res, next);
};
