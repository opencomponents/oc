var oc = oc || {};
(oc.components = oc.components || {}),
  (oc.components.ab16fc5f93c027e4ce2f30db29b9f93586bd1af9 = function (e) {
    var n,
      a = [],
      i = e || {};
    return (
      function (e, i, c) {
        a.push(
          '<span>hi ' +
            jade.escape(null == (n = e) ? '' : n) +
            ' ' +
            jade.escape(null == (n = i) ? '' : n) +
            ' (' +
            jade.escape(null == (n = c) ? '' : n) +
            ')</span>'
        );
      }.call(
        this,
        'firstName' in i
          ? i.firstName
          : 'undefined' != typeof firstName
          ? firstName
          : void 0,
        'lastName' in i
          ? i.lastName
          : 'undefined' != typeof lastName
          ? lastName
          : void 0,
        'nick' in i ? i.nick : 'undefined' != typeof nick ? nick : void 0
      ),
      a.join('')
    );
  });
