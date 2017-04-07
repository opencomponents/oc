'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');

describe('registry : domain : validator', function(){

  const validator = require('../../src/registry/domain/validators'),
    baseS3Conf = {
      bucket: 'oc-components',
      key: 's3-key',
      region: 'us-west2',
      secret: 's3-secret'
    };

  describe('when validating registry configuration', function(){

    const validate = function(a){ return validator.validateRegistryConfiguration(a); };

    describe('when configuration null', function(){

      const conf = null;

      it('should not be valid', function(){
        expect(validate(conf).isValid).to.be.false;
        expect(validate(conf).message).to.equal('Registry configuration is empty');
      });
    });

    describe('when configuration empty', function(){

      const conf = {};

      it('should not be valid', function(){
        expect(validate(conf).isValid).to.be.false;
        expect(validate(conf).message).to.equal('Registry configuration is empty');
      });
    });

    describe('prefix', function(){
      describe('when prefix does not start with /', function(){

        const conf = { prefix: 'hello/', s3: baseS3Conf };

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: prefix should start with "/"');
        });
      });

      describe('when prefix does not end with /', function(){

        const conf = { prefix: '/hello', s3: baseS3Conf };

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: prefix should end with "/"');
        });
      });
    });

    describe('publishAuth', function(){
      describe('when not specified', function(){

        const conf = { publishAuth: null, s3: baseS3Conf };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified and not supported', function(){

        const conf = { publishAuth: { type: 'blarg' }, s3: baseS3Conf};

        it('should not be valid', function(){
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: module "oc-auth-blarg" not found');
        });
      });

      describe('when specified and basic', function(){

        describe('when username and password specified', function(){

          const conf = { publishAuth: { type: 'basic', username: 'a', password: 'b' }, s3: baseS3Conf};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when username and password not specified', function(){

          const conf = { publishAuth: { type: 'basic', a: '' }, s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal('Registry configuration is not valid: basic auth requires username and password');
          });
        });
      });
    });

    describe('dependencies', function(){
      describe('when not specified', function(){

        const conf = { dependencies: null, s3: baseS3Conf };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', function(){

        describe('when it is an array', function(){

          const conf = { dependencies: ['hello'], s3: baseS3Conf};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when it is not an array', function(){

          const conf = { dependencies: { hello: 'world' }, s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal('Registry configuration is not valid: dependencies must be an array');
          });
        });
      });
    });

    describe('s3', function(){
      describe('when local=true', function(){

        const conf = { local: true };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when not in local mode', function(){

        const errorMessage = 'Registry configuration is not valid: S3 configuration is not valid';

        describe('when s3 settings empty', function(){
          const conf = { publishAuth: false, s3: {}};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing bucket', function(){
          const conf = { publishAuth: false, s3: {
            key: 's3-key', region: 'us-west2', secret: 's3-secret'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing key', function(){
          const conf = { publishAuth: false, s3: {
            bucket: 'oc-registry', region: 'us-west2', secret: 's3-secret'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing region', function(){
          const conf = { publishAuth: false, s3: {
            bucket: 'oc-registry', key: 's3-key', secret: 's3-secret'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing secret', function(){
          const conf = { publishAuth: false, s3: {
            bucket: 'oc-registry', key: 's3-key', region: 'us-west2'
          }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });
        
        describe('when s3 setting do not use key/secret - EC2 IAM Role use case', function() {
          const conf = {
            publishAuth: false,
            s3: {
              bucket: 'oc-registry',
              region: 'us-west2'
            }
          };

          it('should be valid', function() {
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when s3 setting contains all properties', function(){
          const conf = { publishAuth: false, s3: baseS3Conf};

          it('should be valid', function(){
            expect(validate(conf).isValid).to.be.true;
          });
        });
      });
    });

    describe('routes', function(){
      describe('when not specified', function(){

        const conf = { routes: null, s3: baseS3Conf };

        it('should be valid', function(){
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', function(){

        describe('when not an array', function(){

          const conf = { routes: {thisis: 'anobject', s3: baseS3Conf }};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: routes must be an array');
          });
        });

        describe('when route does not contain route', function(){

          const conf = { routes: [{ method: 'get', handler: function(){}}], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route does not contain handler', function(){

          const conf = { routes: [{ method: 'get', route: '/hello'}], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route does not contain method', function(){

          const conf = { routes: [{ route: '/hello', handler: function(){}}], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: each route should contain route, method and handler');
          });
        });

        describe('when route contains handler that is not a function', function(){

          const conf = { routes: [{ route: '/hello', method: 'get', handler: 'hello' }], s3: baseS3Conf};

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: handler should be a function');
          });
        });

        describe('when route overrides prefix namespace', function(){

          const conf = {
            prefix: '/components/',
            s3: baseS3Conf,
            routes: [{
              route: '/components/hello',
              method: 'get',
              handler: function(){}
            }]
          };

          it('should not be valid', function(){
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql('Registry configuration is not valid: route url can\'t contain "/components/"');
          });
        });
      });
    });

    describe('customHeadersToSkipOnWeakVersion', function() {
      describe('when customHeadersToSkipOnWeakVersion is not an array', function() {
        const conf = { 
          customHeadersToSkipOnWeakVersion: 'test', 
          publishAuth: false, 
          s3: baseS3Conf 
        };

        it('should not be valid', function() {
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: customHeadersToSkipOnWeakVersion must be an array of strings');
        });
      });

      describe('when customHeadersToSkipOnWeakVersion is an array but contains non-string elements', function() {
        const conf = { 
          customHeadersToSkipOnWeakVersion: ['header1', 'header2', 3, 4], 
          publishAuth: false, 
          s3: baseS3Conf
        };

        it('should not be valid', function() {
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal('Registry configuration is not valid: customHeadersToSkipOnWeakVersion must be an array of strings');
        });
      });

      describe('when customHeadersToSkipOnWeakVersion is a non-empty array of strings', function() {
        const conf = { 
          customHeadersToSkipOnWeakVersion: ['header1', 'header2', 'header3'],
          publishAuth: false, 
          s3: baseS3Conf
        };

        it('should be valid', function() {
          expect(validate(conf).isValid).to.be.true;
        });
      });
    });
  });

  describe('when validating component request by parameter', function(){

    const validate = function(a,b){ return validator.validateComponentParameters(a,b); };

    describe('when component have not parameters', function(){
      const componentParameters = {},
        requestParameters = { hello: 'world' };

      it('should be valid', function(){
        expect(validate(requestParameters, componentParameters).isValid).to.be.true;
      });
    });

    describe('when component have not mandatory parameters', function(){
      const componentParameters = {
        name: {
          type: 'string',
          mandatory: false,
          example: 'John Doe'
        }
      };

      it('should be valid when non mandatory parameters not provided', function(){
        const requestParameters = { hello: 'world'};
        expect(validate(requestParameters, componentParameters).isValid).to.be.true;
      });

      it('should be valid when non mandatory parameters provided in a valid format', function(done){
        const requestParameters = { name: 'Walter White' };
        expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        done();
      });

      it('should be not valid when non mandatory parameters provided in a non valid format', function(){
        const requestParameters = { name: 12345 };

        const validateResult = validate(requestParameters, componentParameters);

        expect(validateResult.isValid).to.be.false;
        expect(validateResult.errors).not.to.be.empty;
        expect(validateResult.errors.types['name']).to.equal('wrong type');
        expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: name');
      });
    });

    describe('when component have mandatory parameters', function(){

      it('should not be valid when mandatory parameter not provided', function(){

        const componentParameters = {
          returnUrl: {
            type: 'string',
            mandatory: true,
            example: 'http://www.google.com'
          }
        };
        const requestParameters = {};

        const validateResult = validate(requestParameters, componentParameters);

        expect(validateResult.isValid).to.be.false;
        expect(validateResult.errors).not.to.be.empty;
        expect(validateResult.errors.mandatory['returnUrl']).to.equal('missing');
        expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: returnUrl');
      });

      describe('when mandatory string parameter provided', function(){

        const componentParameters = {
          name: {
            type: 'string',
            mandatory: true,
            example: 'Walter white'
          }
        };

        it('should be valid when parameter in a valid form', function(){
          const requestParameters = { name: 'John Doe' };

          expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        });

        it('should not be valid when parameter in a non valid form', function(){
          const requestParameters = { name: 12345 };

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['name']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: name');
        });

        it('should be valid when parameter is an empty string', function(){
          const requestParameters = { name: '' };

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.true;
        });

        describe('when non mandatory number provided', function(){

          const componentParameters = {
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

          const validComponentParameters = {
            zero: {
              type: 'number',
              mandatory: false,
              example: 2
            }
          };

          it('should not be valid when provided in a non valid form', function(){
            const requestParameters = { age: 'This is not a number' };
            const validateResult = validate(requestParameters, componentParameters);

            expect(validateResult.isValid).to.be.false;
            expect(validateResult.errors).not.to.be.empty;
            expect(validateResult.errors.mandatory['name']).to.equal('missing');
            expect(validateResult.errors.types['age']).to.equal('wrong type');
            expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: name; Parameters are not correctly formatted: age');
          });

          it('should be valid when 0', function(){
            const requestParameters = { zero: 0 };
            const validateResult = validate(requestParameters, validComponentParameters);

            expect(validateResult.isValid).to.be.true;
          });
        });

        describe('when non mandatory boolean provided', function(){

          const componentParameters = {
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
            const requestParameters = { isTrue: 1234 };

            const validateResult = validate(requestParameters, componentParameters);

            expect(validateResult.isValid).to.be.false;
            expect(validateResult.errors).not.to.be.empty;
            expect(validateResult.errors.mandatory['name']).to.equal('missing');
            expect(validateResult.errors.types['isTrue']).to.equal('wrong type');
            expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: name; Parameters are not correctly formatted: isTrue');
          });

        });
      });

      describe('when mandatory number parameter provided', function(){

        const componentParameters = {
          age: {
            type: 'number',
            mandatory: true,
            example: 35
          }
        };

        it('should be valid when parameter in a valid form', function(){
          const requestParameters = { age: 18 };

          expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        });

        it('should not be valid when parameter in a non valid form', function(){
          const requestParameters = { age: 'this is a string' };

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['age']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: age');
        });

        it('should not be valid when parameter is null', function(){
          const requestParameters = { age: null };

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['age']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: age');
        });
      });

      describe('when mandatory boolean parameter provided', function(){

        const componentParameters = {
          happy: {
            type: 'boolean',
            mandatory: true,
            example: true
          }
        };

        it('should be valid when parameter in a valid form', function(){
          const requestParameters = { happy: false };

          expect(validate(requestParameters, componentParameters).isValid).to.be.true;
        });

        it('should not be valid when parameter in a non valid form', function(){
          const requestParameters = { happy: 'this is a string' };

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: happy');
        });

        it('should not be valid when parameter is null', function(){
          const requestParameters = { happy: null };

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: happy');
        });

        it('should not be valid when parameter is undefined', function(){
          const requestParameters = { happy: undefined };

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal('Parameters are not correctly formatted: happy');
        });

        it('should not be valid when parameter not provided', function(){
          const requestParameters = {};

          const validateResult = validate(requestParameters, componentParameters);

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.mandatory['happy']).to.equal('missing');
          expect(validateResult.errors.message).to.equal('Expected mandatory parameters are missing: happy');
        });
      });
    });
  });

  describe('when validating component name for new candidate', function(){

    const validate = function(a){ return validator.validateComponentName(a); };

    describe('when name has spaces', function(){

      const name = 'hello ha';
      it('should not be valid', function(){
        expect(validate(name)).to.be.false;
      });
    });

    describe('when name has not allowed characters', function(){

      const name = 'name@ha';
      it('should not be valid', function(){
        expect(validate(name)).to.be.false;
      });
    });

    describe('when name has alphanumeric characters, _ or -', function(){

      const name = 'hello-world_haha23';
      it('should be valid', function(){
        expect(validate(name)).to.be.true;
      });
    });

    describe('when name is reserved', function(){

      const name = '_package';
      it('should not be valid', function(){
        expect(validate(name)).to.be.false;
      });
    });

  });

  describe('when validating template type for new candidate', function(){
    const validate = function(a){ return validator.validateTemplateType(a); };

    describe('when type is not handlebars or jade', function(){

      const type = 'othertype';
      it('should not be valid', function(){
        expect(validate(type)).to.be.false;
      });
    });

    describe('when type is handlebars', function(){

      const type = 'handlebars';
      it('should be valid', function(){
        expect(validate(type)).to.be.true;
      });
    });

    describe('when type is jade', function(){

      const type = 'jade';
      it('should be valid', function(){
        expect(validate(type)).to.be.true;
      });
    });
  });

  describe('when validating component version for new candidate', function(){

    const existingVersions = ['1.0.0', '1.0.1', '2.0.0', '2.1.0'],
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

    const validate = function(a, b){ return validator.validatePackage(a, b || {}); };

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

    describe('when custom validation provided', function(){
      
      const validate = function(obj){ return validator.validatePackageJson(obj); };

      const customValidator = function(pkg){
        const isValid = !!pkg.author && !!pkg.repository;
        return isValid ? isValid : { isValid: false, error: 'author and repository are required' };
      };

      describe('when package.json does not contain mandatory fields', function(){
        let result;
        beforeEach(function(){
          result = validate({
            packageJson: { name: 'my-component'},
            componentName: 'my-component',
            customValidator: customValidator
          });
        });

        it('should not be valid', function(){
          expect(result.isValid).to.be.false;
        });

        it('should return the error', function(){
          expect(result.error).to.be.equal('author and repository are required');
        });
      });

      describe('when package.json contains mandatory fields', function(){
        let result;
        beforeEach(function(){
          result = validate({
            packageJson: { name: 'my-component', author: 'somebody', repository: 'https://github.com/somebody/my-component'},
            componentName: 'my-component',
            customValidator: customValidator
          });
        });

        it('should be valid', function(){
          expect(result.isValid).to.be.true;
        });
      });
    });

    describe('when package is valid', function(){
      const _package = {
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

    const validate = validator.validatePluginsRequirements;

    describe('when component does not require any plugin', function(){

      const requirements = null,
        supportedPlugins = {
          log: function(){}
        };

      it('should be valid', function(){
        expect(validate(requirements, supportedPlugins).isValid).to.be.true;
      });
    });

    describe('when component requires plugin', function(){

      const requirements = ['getToggle'];
      describe('when registry does not support plugin', function(){
        const supportedPlugins = {
          log: function(){}
        };

        const validationResult = validate(requirements, supportedPlugins);

        it('should not be valid', function(){
          expect(validationResult.isValid).to.be.false;
        });

        it('should list missing dependencies', function(){
          expect(validationResult.missing).to.eql(['getToggle']);
        });
      });

      describe('when registry supports plugin', function(){
        const supportedPlugins = {
          getToggle: function(){ return true; }
        };

        it('should be valid', function(){
          expect(validate(requirements, supportedPlugins).isValid).to.be.true;
        });
      });
    });
  });

  describe('when validating CLI OC version in request headers', function(){
    const validator = injectr('../../src/registry/domain/validators/index.js', {
      './oc-cli-version': injectr('../../src/registry/domain/validators/oc-cli-version.js', {
        '../../../../package.json': { version: '0.16.34'}
      })
    });

    const validate = function(userAgent){
      return validator.validateOcCliVersion(userAgent);
    };

    describe('when user-agent header is not specified', function(){
      const result = validate('value');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', function(){
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when user-agent header doesn\'t have correct format', function(){
      const result = validate('oc-cli/1.2.3-v0.10.35-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', function(){
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when OC CLI version in user-agent header is lower than Registry version', function(){
      const result = validate('oc-cli-0.2.3/v0.10.35-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', function(){
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when OC CLI version in user-agent header is equal to Registry version', function(){
      const result = validate('oc-cli-0.16.34/v0.10.35-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });

    describe('when OC CLI version in user-agent header is higher than Registry version', function(){
      const result = validate('oc-cli-0.16.35/v0.10.35-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });
  });

  describe('when validating node engine version in request headers', function(){
    const validator = injectr('../../src/registry/domain/validators/index.js', {
      './node-version': injectr('../../src/registry/domain/validators/node-version.js', {
        '../../../../package.json': { engines: { node: '>=0.10.35' }}
      })
    });

    const validate = function(userAgent){
      return validator.validateNodeVersion(userAgent, 'v0.10.36');
    };

    describe('when user-agent header is not specified', function(){
      const result = validate('value');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', function(){
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when user-agent header doesn\'t have correct format', function(){
      const result = validate('oc-cli/1.2.3-v0.10.35-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', function(){
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when node version in user-agent header is lower than Registry version of node', function(){
      const result = validate('oc-cli-0.2.3/v0.10.34-darwin-x64');

      it('should be invalid', function(){
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', function(){
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when node version in user-agent header is equal to Registry version of node', function(){
      const result = validate('oc-cli-0.16.34/v0.10.35-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });

    describe('when node version in user-agent header is higher than Registry version of node', function(){
      const result = validate('oc-cli-0.16.35/v0.10.36-darwin-x64');

      it('should be valid', function(){
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', function(){
        expect(result.error).to.be.empty;
      });
    });
  });
});
