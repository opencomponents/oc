module.exports.data = (a, s) => {
  s(null, {
    firstName: a.params.firstName,
    lastName: a.params.lastName,
    nick: a.params.nick
  });
};
