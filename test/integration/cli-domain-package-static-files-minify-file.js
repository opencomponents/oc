'use strict';

const expect = require('chai').expect;

describe('cli : domain : package-static-files : minify-file', () => {
  const minifyFile = require('../../src/cli/domain/package-static-files/minify-file');

  describe('when minifying .js file', () => {

    describe('when file contains es6', () => {

      const content = 'const hi = (name) => `hello ${name}`;';

      it('should minify it', () => {
        const minified = minifyFile('.js', content);
        expect(minified).to.equal('var hi=function(n){return"hello "+n};');
      });
    });

    describe('when file contains not valid js', () => {
      const content = 'const a=notvalid(';
      const execute = function(){
        minifyFile('.js', content);
      };

      it('should throw an exception', () => {
        expect(execute).to.throw('Unexpected token');
      });
    });
  });
});
