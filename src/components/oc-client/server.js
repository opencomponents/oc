'use strict';

export const data = (context, callback) => {
  const { templates } = context;
  return callback(null, { templates });
};
