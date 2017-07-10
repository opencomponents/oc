'use strict';

export const data = (context, callback) => {
  const { staticPath, templates } = context;
  return callback(null, { staticPath, templates });
};
