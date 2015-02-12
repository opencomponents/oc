'use strict';

var expect = require('chai').expect;

describe('registry : domain : validator', function(){

  var validator = require('../../registry/domain/validator');

  describe('when validating registry configuration', function(){

    var validate = function(a){ return validator.registryConfiguration(a); };

    describe('when configuration null', function(){

      var conf = null;

      it('should not be valid', function(){
        expect(validate(conf).isValid).to.be.false;
        expect(validate(conf).message).to.equal('Registry configuration is empty');
      });
    });

    describe('when configuration empty', function(){

      var conf = {};

      it('should not be valid', function(){
        expect(validate(conf).isValid).to.be.false;
        expect(validate(conf).message).to.equal('Registry configuration is empty');
      });
    });

    describe('prefix', function(){
      describe('when prefix does not start with /', function(){

        var conf = { prefix: 'hello/' };

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: prefix should start with "/"');
        });
      });

      describe('when prefix does not end with /', function(){

        var conf = { prefix: '/hello' };

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: prefix should end with "/"');
        });
      });
    });

    describe('publishAuth', function(){
      describe('when not specified', function(){

        var conf = { publishAuth: null };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified and not supported', function(){

        var conf = { publishAuth: { type: 'oauth' }};

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: auth not supported');
        });
      });

      describe('when specified and basic', function(){

        describe('when username and password specified', function(){

          var conf = { publishAuth: { type: 'basic', username: 'a', password: 'b' }};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when username and password not specified', function(){

          var conf = { publishAuth: { type: 'basic', a: '' }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal('Registry configuration is not valid: basic auth requires username and password');
          });
        });
      });
    });

    describe('dependencies', function(){
      describe('when not specified', function(){

        var conf = { dependencies: null };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', function(){

        describe('when it is an object', function(){

          var conf = { dependencies: { hello: 'world' }};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when it is not an object', function(){

          var conf = { dependencies: ['hello']};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal('Registry configuration is not valid: dependencies must be an object');
          });
        });
      });
    });

    describe('routes', function(){
      describe('when not specified', function(){

        var conf = { routes: null };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', function(){

        describe('when not an array', function(){

          var conf = { routes: {thisis: 'anobject' }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: routes must be an array');
          });
        });

        describe('when route does not contain route', function(){

          var conf = { routes: [{ method: 'get', handler: function(){}}]};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route does not contain handler', function(){

          var conf = { routes: [{ method: 'get', route: '/hello'}]};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route does not contain method', function(){

          var conf = { routes: [{ route: '/hello', handler: function(){}}]};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route contains handler that is not a function', function(){

          var conf = { routes: [{ route: '/hello', method: 'get', handler: 'hello' }]};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: handler should be a function');
          });
        });
      });
    });

    describe('onRequest', function(){
      describe('when not specified', function(){

        var conf = { onRequest: null };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', function(){

        describe('when it is not a function', function(){

          var conf = { onRequest: true };

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: onRequest must be a function');
          });
        });

        describe('when it is a function', function(){

          var conf = { onRequest: function(){}};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });
      });
    });
  });

  describe('when validating component request by parameter', function(){

    var validate = function(a,b){ return validator.validateComponentParameters(a,b); };

    describe('when component have not parameters', function(){
      var componentParameters = {},
          requestParameters = { hello: 'world' };

      it('should be valid', function(){
        expect(validate(requestParameters, componentParameters).isValid).to.be.true;
      });
    });

    describe('when component have not mandatory parameters', function(){
      var componentParameters = { 
        name: {
          type: 'string',
          mandatory: false,
          example: 'John Doe'
        }
      };

      it('should be valid when non mandatory parameters not provided', function(){
        var requestParameters = { hello: 'world'};
        expect(validate(requestParameters, componentParameters).isValid).to.be.true;
      });

      it('should be valid when non mandatory parameters provided in a valid format', function(done){
        var requestParameters = { name: 'Walter White' };
        expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        done();
      });

      it('should be not valid when non mandatory parameters provided in a non valid format', function(){
        var requestParameters = { name: 12345 };

        var validateResult = validate(requestParameters, componentParameters);

        expect(validateResult.isValid).to.be.false;
        expect(validateResult.errors).not.to.be.empty;
        expect(validateResult.errors.types['name']).to.equal('wrong type');
        expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: name');
      });
    });

    describe('when component have mandatory parameters', function(){

      it('should not be valid when mandatory parameter not provided', function(){
        
        var componentParameters = {
          returnUrl: {
            type: 'string',
            mandatory: true,
            example: 'http://www.google.com'
          }
        };
        var requestParameters = {};

        var validateResult = validate(requestParameters, componentParameters);

        expect(validateResult.isValid).to.be.false;
        expect(validateResult.errors).not.to.be.empty;
        expect(validateResult.errors.mandatory['returnUrl']).to.equal('missing');
        expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: returnUrl');
      });

      describe('when mandatory string parameter provided', function(){
        
        var componentParameters = {
          name: {
            type: 'string',
            mandatory: true,
            example: 'Walter white'
          }
        };

        it('should be valid when parameter in a valid form', function(){
          var requestParameters = { name: 'John Doe' };

          expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        });

        it('should not be valid when parameter in a non valid form', function(){
          var requestParameters = { name: 12345 };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['name']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: name');
        });

        it('should not be valid when parameter is empty', function(){
          var requestParameters = { name: '' };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['name']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: name');
        });

        describe('when non mandatory number provided', function(){
        
          var componentParameters = {
            name: {
              type: 'string',
              mandatory: true,
              example: 'Walter white'
            },
            age: {
              type: 'number',
              mandatory: false,
              example: 35
            }
          };

          it('should not be valid when provided in a non valid form', function(){
            var requestParameters = { age: 'This is not a number' };

            var validateResult = validate(requestParameters, componentParameters);

            expect(validateResult.isValid).to.be.false;
            expect(validateResult.errors).not.to.be.empty;
            expect(validateResult.errors.mandatory['name']).to.equal('missing');
            expect(validateResult.errors.types['age']).to.equal('wrong type');
            expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: name; Parameters are not correctly formatted: age');
          });

        });

        describe('when non mandatory boolean provided', function(){
        
          var componentParameters = {
            name: {
              type: 'string',
              mandatory: true,
              example: 'Walter white'
            },
            isTrue: {
              type: 'boolean',
              mandatory: false,
              example: false
            }
          };

          it('should not be valid when provided in a non valid form', function(){
            var requestParameters = { isTrue: 1234 };

            var validateResult = validate(requestParameters, componentParameters);

            expect(validateResult.isValid).to.be.false;
            expect(validateResult.errors).not.to.be.empty;
            expect(validateResult.errors.mandatory['name']).to.equal('missing');
            expect(validateResult.errors.types['isTrue']).to.equal('wrong type');
            expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: name; Parameters are not correctly formatted: isTrue');
          });

        });
      });

      describe('when mandatory number parameter provided', function(){

        var componentParameters = {
          age: {
            type: 'number',
            mandatory: true,
            example: 35
          }
        };

        it('should be valid when parameter in a valid form', function(){
          var requestParameters = { age: 18 };

          expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        });

        it('should not be valid when parameter in a non valid form', function(){
          var requestParameters = { age: 'this is a string' };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['age']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: age');
        });

        it('should not be valid when parameter is null', function(){
          var requestParameters = { age: null };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['age']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: age');
        });
      });

      describe('when mandatory boolean parameter provided', function(){

        var componentParameters = {
          happy: {
            type: 'boolean',
            mandatory: true,
            example: true
          }
        };

        it('should be valid when parameter in a valid form', function(){
          var requestParameters = { happy: false };

          expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        });

        it('should not be valid when parameter in a non valid form', function(){
          var requestParameters = { happy: 'this is a string' };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: happy');
        });

        it('should not be valid when parameter is null', function(){
          var requestParameters = { happy: null };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: happy');
        });

        it('should not be valid when parameter is undefined', function(){
          var requestParameters = { happy: undefined };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: happy');
        });

        it('should not be valid when parameter not provided', function(){
          var requestParameters = {};

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.mandatory['happy']).to.equal('missing');
          expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: happy');
        });
      });
    });
  });

  describe('when validating component name for new candidate', function(){

    var validate = function(a){ return validator.validateComponentName(a); };

    describe('when name has spaces', function(){

      var name = 'hello ha';
      it('should not be valid', function(){
        expect(validate(name)).to.be.false;
      });
    });

    describe('when name has not allowed characters', function(){

      var name = 'name@ha';
      it('should not be valid', function(){
        expect(validate(name)).to.be.false;
      });
    });

    describe('when name has alphanumeric characters, _ or -', function(){

      var name = 'hello-world_haha23';
      it('should be valid', function(){
        expect(validate(name)).to.be.true;
      });
    });

  });

  describe('when validating template type for new candidate', function(){
    var validate = function(a){ return validator.validateTemplateType(a); };

    describe('when type is not handlebars or jade', function(){

      var type = 'othertype';
      it('should not be valid', function(){
        expect(validate(type)).to.be.false;
      });
    });

    describe('when type is handlebars', function(){

      var type = 'handlebars';
      it('should be valid', function(){
        expect(validate(type)).to.be.true;
      });
    });

    describe('when type is jade', function(){

      var type = 'jade';
      it('should be valid', function(){
        expect(validate(type)).to.be.true;
      });
    });
  });

  describe('when validating component version for new candidate', function(){

    var existingVersions = ['1.0.0', '1.0.1', '2.0.0', '2.1.0'],
        validate = function(a,b){ return validator.validateVersion(a, b); };
  
    describe('when version already exists', function(){
      it('should not be valid', function(){
        expect(validate('this.is.not.valid', existingVersions).isValid).not.to.be.true;
      });
    });

    describe('when version does not exist', function(){
      it('should be valid', function(){
        expect(validate('1.2.33', existingVersions).isValid).to.be.true;
      });
    });
  });

  describe('when validating component package for new candidate', function(){

    var validate = function(a){ return validator.validatePackage(a); };

    describe('when package not valid', function(){

      it('should not be valid when uploaded files is empty', function(){
        expect(validate({}).isValid).to.be.false;
      });

      it('should not be valid when uploaded package consists of multiple files', function(){
        expect(validate({ afile: {}, anotherFile: {}}).isValid).to.be.false;
      });

      it('should not be valid when file has not the proper file extension', function(){
        expect(validate({ theFile: {
          fieldname: 'file.jpg',
          originalname: 'file.jpg',
          name: 'file-1415986760368.jpg',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          path: 'temp/file-1415986760368.jpg',
          extension: 'jpg',
          size: 123,
          truncated: false
        }}).isValid).to.be.false;
      });

      it('should not be valid when file has been truncated', function(){
        expect(validate({ theFile: {
          fieldname: 'package.tar.gz',
          originalname: 'package.tar.gz',
          name: 'theFile-1415986760368.tar.gz',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          path: 'temp/package-1415986760368.tar.gz',
          extension: 'gz',
          size: 3707,
          truncated: true
        }}).isValid).to.be.false;
      });
    });

    describe('when package is valid', function(){
      var _package = {
        fieldname: 'package.tar.gz',
        originalname: 'package.tar.gz',
        name: 'theFile-1415986760368.tar.gz',
        encoding: '7bit',
        mimetype: 'application/octet-stream',
        path: 'temp/package-1415986760368.tar.gz',
        extension: 'gz',
        size: 3707,
        truncated: false
      };

      it('should be valid', function(){
        expect(validate({ theFile: _package }).isValid).to.be.true;
      });
    });
  });
});