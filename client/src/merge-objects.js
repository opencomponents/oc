'use strict';

function addProperties(source, destination) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      destination[key] = source[key];
    }
  }
}

// info: use Object.assign() w/ ES6
module.exports = function (obj1, obj2) {
  var obj3 = {};
  addProperties(obj1, obj3);
  addProperties(obj2, obj3);
  return obj3;
};
