module.exports.data = (context, callback) => {
  callback(null, {
    firstName: context.params.firstName || 'John',
    lastName: context.params.lastName || 'Doe'
  });
};
