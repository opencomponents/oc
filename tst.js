/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
const changelog = require('./tasks/changelog');

console.log('ASDADS');
changelog()
  .then(x => {
    console.log('SUCCESS');
    console.log(x);
  })
  .catch(err => {
    console.log('ERROR');
    console.error(err);
  });

console.log('ZXCZX');
