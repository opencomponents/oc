'use strict';

var expect = require('chai').expect;

describe('cli : domain : package-static-files : minify-file', function(){
	var minifyFile = require('../../src/cli/domain/package-static-files/minify-file');

	describe('when minifying .js file', function(){

		describe('when file contains es6', function(){

			var content = 'const hi = (name) => `hello ${name}`;';

			it('should minify it', function(){
				var minified = minifyFile('.js', content);
				expect(minified).to.equal('var hi=function(n){return"hello "+n};');
			});
		});

		describe('when file contains not valid js', function(){

			var content = 'const a=notvalid(';
			var execute = function(){
				minifyFile('.js', content);
			};

			it('should throw an exception', function(){
				expect(execute).to.throw('Unexpected token');
			});
		});
	});
});
