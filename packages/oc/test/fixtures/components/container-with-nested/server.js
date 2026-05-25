module.exports.data = (context, callback) => {
  context.renderComponent('no-containers', (err, html) => {
    callback(err, { nested: html });
  });
};
