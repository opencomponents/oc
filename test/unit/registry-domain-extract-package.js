'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');
var sinon = require('sinon');

describe('registry : domain : extract-package', function(){

  var decompressStub = sinon.stub(),
      pathResolveStub = sinon.stub();

  var extractPackage = injectr('../../src/registry/domain/extract-package.js', {
    targz: { decompress: decompressStub },
    path: { resolve: pathResolveStub },
    './get-package-json-from-temp-dir': sinon.stub().yields(null, { package: 'hello' })
  }, { console: console});

  describe('when successfully extracting package', function(){

    var error, response;

    beforeEach(function(done){
      pathResolveStub.reset();
      pathResolveStub.onCall(0).returns('/some-path/registry/temp/1478279453422.tar.gz');
      pathResolveStub.onCall(1).returns('/some-path/registry/temp/1478279453422/');
      pathResolveStub.onCall(2).returns('/some-path/registry/temp/1478279453422/_package/');

      decompressStub.yields();

      extractPackage({
        '1478279453422.tar.gz': {
          name: '1478279453422.tar.gz',
          path: '/some-path/registry/temp/1478279453422.tar.gz'
        }
      }, function(err, res){
        error = err;
        response = res;
        done();
      });
    });

    it('should decompress tar.gz file', function(){
      expect(decompressStub.args[0][0]).to.eql({
        src: '/some-path/registry/temp/1478279453422.tar.gz',
        dest: '/some-path/registry/temp/1478279453422/'
      });
    });

    it('should respond', function(){
      expect(response).to.eql({
        outputFolder: '/some-path/registry/temp/1478279453422/_package/',
        packageJson: { package: 'hello' }
      });
    });
  });

  describe('when extracting package fails', function(){

    var error, response;

    beforeEach(function(done){
      pathResolveStub.reset();
      pathResolveStub.onCall(0).returns('/some-path/registry/temp/1478279453422.tar.gz');
      pathResolveStub.onCall(1).returns('/some-path/registry/temp/1478279453422/');
      pathResolveStub.onCall(2).returns('/some-path/registry/temp/1478279453422/_package/');

      decompressStub.yields('error!');

      extractPackage({
        '1478279453422.tar.gz': {
          name: '1478279453422.tar.gz',
          path: '/some-path/registry/temp/1478279453422.tar.gz'
        }
      }, function(err, res){
        error = err;
        done();
      });
    });

    it('should respond with error', function(){
      expect(error).to.equal('error!');
    });
  });
});