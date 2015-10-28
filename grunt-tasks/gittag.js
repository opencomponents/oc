'use strict';

module.exports = {
  addtag: {
    options: {
      tag: 'v<%= version %>',
      message: 'Package version upgrade to: <%= version %>',
      annotated: true
    }
  }
};
