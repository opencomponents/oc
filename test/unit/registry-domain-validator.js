'use strict';

var expect = require('chai').expect;
var injectr = require('injectr');

describe('registry : domain : validator', function(){

  var validator = require('../../src/registry/domain/validators'),
      baseS3Conf = {
        bucket: 'oc-components',
        key: 's3-key',
        region: 'us-west2',
        secret: 's3-secret'
      };

  describe('when validating registry configuration', function(){

    var validate = function(a){ return validator.validateRegistryConfiguration(a); };

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

        var conf = { prefix: 'hello/', s3: baseS3Conf };

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: prefix should start with "/"');
        });
      });

      describe('when prefix does not end with /', function(){

        var conf = { prefix: '/hello', s3: baseS3Conf };

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: prefix should end with "/"');
        });
      });
    });

    describe('publishAuth', function(){
      describe('when not specified', function(){

        var conf = { publishAuth: null, s3: baseS3Conf };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified and not supported', function(){

        var conf = { publishAuth: { type: 'blarg' }, s3: baseS3Conf};

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: module "oc-auth-blarg" not found');
        });
      });

      describe('when specified and basic', function(){

        describe('when username and password specified', function(){

          var conf = { publishAuth: { type: 'basic', username: 'a', password: 'b' }, s3: baseS3Conf};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when username and password not specified', function(){

          var conf = { publishAuth: { type: 'basic', a: '' }, s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal('Registry configuration is not valid: basic auth requires username and password');
          });
        });
      });
    });

    describe('dependencies', function(){
      describe('when not specified', function(){

        var conf = { dependencies: null, s3: baseS3Conf };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', function(){

        describe('when it is an array', function(){

          var conf = { dependencies: ['hello'], s3: baseS3Conf};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when it is not an array', function(){

          var conf = { dependencies: { hello: 'world' }, s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal('Registry configuration is not valid: dependencies must be an array');
          });
        });
      });
    });

    describe('s3', function(){
      describe('when local=true', function(){

        var conf = { local: true };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when not in local mode', function(){

        var errorMessage = 'Registry configuration is not valid: S3 configuration is not valid';

        describe('when s3 settings empty', function(){
          var conf = { publishAuth: false, s3: {}};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing bucket', function(){
          var conf = { publishAuth: false, s3: {
            key: 's3-key', region: 'us-west2', secret: 's3-secret'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing key', function(){
          var conf = { publishAuth: false, s3: {
            bucket: 'oc-registry', region: 'us-west2', secret: 's3-secret'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing region', function(){
          var conf = { publishAuth: false, s3: {
            bucket: 'oc-registry', key: 's3-key', secret: 's3-secret'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing secret', function(){
          var conf = { publishAuth: false, s3: {
            bucket: 'oc-registry', key: 's3-key', region: 'us-west2'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting contains all properties', function(){
          var conf = { publishAuth: false, s3: baseS3Conf};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });
      });
    });

    describe('routes', function(){
      describe('when not specified', function(){

        var conf = { routes: null, s3: baseS3Conf };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', function(){

        describe('when not an array', function(){

          var conf = { routes: {thisis: 'anobject', s3: baseS3Conf }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: routes must be an array');
          });
        });

        describe('when route does not contain route', function(){

          var conf = { routes: [{ method: 'get', handler: function(){}}], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route does not contain handler', function(){

          var conf = { routes: [{ method: 'get', route: '/hello'}], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route does not contain method', function(){

          var conf = { routes: [{ route: '/hello', handler: function(){}}], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route contains handler that is not a function', function(){

          var conf = { routes: [{ route: '/hello', method: 'get', handler: 'hello' }], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: handler should be a function');
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

        it('should be valid when parameter is an empty string', function(){
          var requestParameters = { name: '' };

          var validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.true;
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

          var validComponentParameters = {
            zero: {
              type: 'number',
              mandatory: false,
              example: 2
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

          it('should be valid when 0', function(){
            var requestParameters = { zero: 0 };
            var validateResult = validate(requestParameters, validComponentParameters);

            expect(validateResult.isValid).to.be.true;
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

    describe('when name is reserved', function(){

      var name = '_package';
      it('should not be valid', function(){
        expect(validate(name)).to.be.false;
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
        isValid = function(a,b){ return validator.validateVersion(a, b); };

    describe('when version already exists', function(){
      it('should not be valid', function(){
        expect(isValid('this.is.not.valid', existingVersions)).not.to.be.true;
      });
    });

    describe('when version does not exist', function(){
      it('should be valid', function(){
        expect(isValid('1.2.33', existingVersions)).to.be.true;
      });
    });
  });

  describe('when validating component package for new candidate', function(){

    var validate = function(a, b){ return validator.validatePackage(a, b || {}); };

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
/*
    describe('when custom validation provided', function(){
      var registryConf = {
        publishValidation: function(p, callback){
          var isValid = !!p.description;
          callback(isValid ? null, 'description param missing');
        }
      };

      
    });*/

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

  describe('when validating component plugin requirements', function(){

    var validate = validator.validatePluginsRequirements;

    describe('when component does not require any plugin', function(){

      var requirements = null,
          supportedPlugins = {
            log: function(){}
          };

      it('should be valid', function(){
        expect(validate(requirements, supportedPlugins).isValid).to.be.true;
      });
    });

    describe('when component requires plugin', function(){

      var requirements = ['getToggle'];
      describe('when registry does not support plugin', function(){
        var supportedPlugins = {
          log: function(){}
        };

        var validationResult = validate(requirements, supportedPlugins);

        it('should not be valid', function(){
          expect(validationResult.isValid).to.be.false;
        });

        it('should list missing dependencies', function(){
          expect(validationResult.missing).to.eql(['getToggle']);
        });
      });

      describe('when registry supports plugin', function(){
        var supportedPlugins = {
          getToggle: function(){ return true; }
        };

        it('should be valid', function(){
          expect(validate(requirements, supportedPlugins).isValid).to.be.true;
        });
      });
    });
  });

  describe('when validating CLI OC version in request headers', function(){
    var validator = injectr('../../src/registry/domain/validators/index.js', {
      './oc-cli-version': injectr('../../src/registry/domain/validators/oc-cli-version.js', {
        '../../../../package.json': { version: '0.16.34'}
      })
    });

    var validate = function(userAgent){
      return validator.validateOcCliVersion(userAgent);
    };

    describe('when user-agent header is not specified', function(){
      var result = validate('value');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', function(){
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when user-agent header doesn\'t have correct format', function(){
      var result = validate('oc-cli/1.2.3-v0.10.35-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', function(){
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when OC CLI version in user-agent header is lower than Registry version', function(){
      var result = validate('oc-cli-0.2.3/v0.10.35-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', function(){
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when OC CLI version in user-agent header is equal to Registry version', function(){
      var result = validate('oc-cli-0.16.34/v0.10.35-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });

    describe('when OC CLI version in user-agent header is higher than Registry version', function(){
      var result = validate('oc-cli-0.16.35/v0.10.35-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });
  });

  describe('when validating node engine version in request headers', function(){
    var validator = injectr('../../src/registry/domain/validators/index.js', {
      './node-version': injectr('../../src/registry/domain/validators/node-version.js', {
        '../../../../package.json': { engines: { node: '>=0.10.35' }}
      })
    });

    var validate = function(userAgent){
      return validator.validateNodeVersion(userAgent, 'v0.10.36');
    };

    describe('when user-agent header is not specified', function(){
      var result = validate('value');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', function(){
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when user-agent header doesn\'t have correct format', function(){
      var result = validate('oc-cli/1.2.3-v0.10.35-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', function(){
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when node version in user-agent header is lower than Registry version of node', function(){
      var result = validate('oc-cli-0.2.3/v0.10.34-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', function(){
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when node version in user-agent header is equal to Registry version of node', function(){
      var result = validate('oc-cli-0.16.34/v0.10.35-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });

    describe('when node version in user-agent header is higher than Registry version of node', function(){
      var result = validate('oc-cli-0.16.35/v0.10.36-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });
  });
});
