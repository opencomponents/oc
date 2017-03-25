'use strict';

var expect = require('chai').expect;

describe('cli : domain : package-static-files : minify-file', function(){
	var minifyFile = require('../../src/cli/domain/package-static-files/minify-file');

	describe('when minifying .js file', function(){

		describe('when file contains es6', function(){

			var content = 'const hi = (name) => `hello ${name}`;';
			var minified;

			before(function(){
				minified = minifyFile('.js', content);
			});

			it('should minify it', function(){
				expect(minified).to.be.a('string');
				expect(minified).not.to.contain('const');
				expect(minified).to.contain('var');
				expect(minified).not.to.contain('name');
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
