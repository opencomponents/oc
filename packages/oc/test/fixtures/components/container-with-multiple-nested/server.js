module.exports.data = (context, callback) => {
  context.renderComponents(
    [
      {
        name: 'welcome',
        parameters: { firstName: 'Jane' }
      },
      {
        name: 'welcome',
        parameters: { firstName: 'John' }
      }
    ],
    {
      parameters: { lastName: 'Doe' }
    },
    (err, components) => {
      callback(err, { nested: components });
    }
  );
};
