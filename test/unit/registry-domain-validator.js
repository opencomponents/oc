'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const _ = require('lodash');

describe('registry : domain : validator', () => {
  const validator = require('../../src/registry/domain/validators'),
    baseS3Conf = {
      bucket: 'oc-components',
      key: 's3-key',
      region: 'us-west2',
      secret: 's3-secret'
    };

  describe('when validating registry configuration', () => {
    const validate = function(a) {
      return validator.validateRegistryConfiguration(a);
    };

    describe('when configuration null', () => {
      const conf = null;

      it('should not be valid', () => {
        expect(validate(conf).isValid).to.be.false;
        expect(validate(conf).message).to.equal(
          'Registry configuration is empty'
        );
      });
    });

    describe('when configuration empty', () => {
      const conf = {};

      it('should not be valid', () => {
        expect(validate(conf).isValid).to.be.false;
        expect(validate(conf).message).to.equal(
          'Registry configuration is empty'
        );
      });
    });

    describe('prefix', () => {
      describe('when prefix does not start with /', () => {
        const conf = { prefix: 'hello/', s3: baseS3Conf };

        it('should not be valid', () => {
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal(
            'Registry configuration is not valid: prefix should start with "/"'
          );
        });
      });

      describe('when prefix does not end with /', () => {
        const conf = { prefix: '/hello', s3: baseS3Conf };

        it('should not be valid', () => {
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal(
            'Registry configuration is not valid: prefix should end with "/"'
          );
        });
      });
    });

    describe('publishAuth', () => {
      describe('when not specified', () => {
        const conf = { publishAuth: null, s3: baseS3Conf };

        it('should be valid', () => {
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified and not supported', () => {
        const conf = { publishAuth: { type: 'blarg' }, s3: baseS3Conf };

        it('should not be valid', () => {
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal(
            'Registry configuration is not valid: module "oc-auth-blarg" not found'
          );
        });
      });

      describe('when specified and basic', () => {
        describe('when username and password specified', () => {
          const conf = {
            publishAuth: { type: 'basic', username: 'a', password: 'b' },
            s3: baseS3Conf
          };

          it('should be valid', () => {
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when username and password not specified', () => {
          const conf = {
            publishAuth: { type: 'basic', a: '' },
            s3: baseS3Conf
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(
              'Registry configuration is not valid: basic auth requires username and password'
            );
          });
        });
      });
    });

    describe('dependencies', () => {
      describe('when not specified', () => {
        const conf = { dependencies: null, s3: baseS3Conf };

        it('should be valid', () => {
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', () => {
        describe('when it is an array', () => {
          const conf = { dependencies: ['hello'], s3: baseS3Conf };

          it('should be valid', () => {
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when it is not an array', () => {
          const conf = { dependencies: { hello: 'world' }, s3: baseS3Conf };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(
              'Registry configuration is not valid: dependencies must be an array'
            );
          });
        });
      });
    });

    describe('s3', () => {
      describe('when local=true', () => {
        const conf = { local: true };

        it('should be valid', () => {
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when not in local mode', () => {
        const errorMessage =
          'Registry configuration is not valid: S3 configuration is not valid';

        describe('when s3 settings empty', () => {
          const conf = { publishAuth: false, s3: {} };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing bucket', () => {
          const conf = {
            publishAuth: false,
            s3: {
              key: 's3-key',
              region: 'us-west2',
              secret: 's3-secret'
            }
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing key', () => {
          const conf = {
            publishAuth: false,
            s3: {
              bucket: 'oc-registry',
              region: 'us-west2',
              secret: 's3-secret'
            }
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing region', () => {
          const conf = {
            publishAuth: false,
            s3: {
              bucket: 'oc-registry',
              key: 's3-key',
              secret: 's3-secret'
            }
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting is missing secret', () => {
          const conf = {
            publishAuth: false,
            s3: {
              bucket: 'oc-registry',
              key: 's3-key',
              region: 'us-west2'
            }
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.equal(errorMessage);
          });
        });

        describe('when s3 setting do not use key/secret - EC2 IAM Role use case', () => {
          const conf = {
            publishAuth: false,
            s3: {
              bucket: 'oc-registry',
              region: 'us-west2'
            }
          };

          it('should be valid', () => {
            expect(validate(conf).isValid).to.be.true;
          });
        });

        describe('when s3 setting contains all properties', () => {
          const conf = { publishAuth: false, s3: baseS3Conf };

          it('should be valid', () => {
            expect(validate(conf).isValid).to.be.true;
          });
        });
      });
    });

    describe('routes', () => {
      describe('when not specified', () => {
        const conf = { routes: null, s3: baseS3Conf };

        it('should be valid', () => {
          expect(validate(conf).isValid).to.be.true;
        });
      });

      describe('when specified', () => {
        describe('when not an array', () => {
          const conf = { routes: { thisis: 'anobject', s3: baseS3Conf } };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql(
              'Registry configuration is not valid: routes must be an array'
            );
          });
        });

        describe('when route does not contain route', () => {
          const conf = {
            routes: [{ method: 'get', handler: function() {} }],
            s3: baseS3Conf
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql(
              'Registry configuration is not valid: each route should contain route, method and handler'
            );
          });
        });

        describe('when route does not contain handler', () => {
          const conf = {
            routes: [{ method: 'get', route: '/hello' }],
            s3: baseS3Conf
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql(
              'Registry configuration is not valid: each route should contain route, method and handler'
            );
          });
        });

        describe('when route does not contain method', () => {
          const conf = {
            routes: [{ route: '/hello', handler: function() {} }],
            s3: baseS3Conf
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql(
              'Registry configuration is not valid: each route should contain route, method and handler'
            );
          });
        });

        describe('when route contains handler that is not a function', () => {
          const conf = {
            routes: [{ route: '/hello', method: 'get', handler: 'hello' }],
            s3: baseS3Conf
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql(
              'Registry configuration is not valid: handler should be a function'
            );
          });
        });

        describe('when route overrides prefix namespace', () => {
          const conf = {
            prefix: '/components/',
            s3: baseS3Conf,
            routes: [
              {
                route: '/components/hello',
                method: 'get',
                handler: function() {}
              }
            ]
          };

          it('should not be valid', () => {
            expect(validate(conf).isValid).to.be.false;
            expect(validate(conf).message).to.be.eql(
              'Registry configuration is not valid: route url can\'t contain "/components/"'
            );
          });
        });
      });
    });

    describe('customHeadersToSkipOnWeakVersion', () => {
      describe('when customHeadersToSkipOnWeakVersion is not an array', () => {
        const conf = {
          customHeadersToSkipOnWeakVersion: 'test',
          publishAuth: false,
          s3: baseS3Conf
        };

        it('should not be valid', () => {
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal(
            'Registry configuration is not valid: customHeadersToSkipOnWeakVersion must be an array of strings'
          );
        });
      });

      describe('when customHeadersToSkipOnWeakVersion is an array but contains non-string elements', () => {
        const conf = {
          customHeadersToSkipOnWeakVersion: ['header1', 'header2', 3, 4],
          publishAuth: false,
          s3: baseS3Conf
        };

        it('should not be valid', () => {
          expect(validate(conf).isValid).to.be.false;
          expect(validate(conf).message).to.equal(
            'Registry configuration is not valid: customHeadersToSkipOnWeakVersion must be an array of strings'
          );
        });
      });

      describe('when customHeadersToSkipOnWeakVersion is a non-empty array of strings', () => {
        const conf = {
          customHeadersToSkipOnWeakVersion: ['header1', 'header2', 'header3'],
          publishAuth: false,
          s3: baseS3Conf
        };

        it('should be valid', () => {
          expect(validate(conf).isValid).to.be.true;
        });
      });
    });
  });

  describe('when validating component request by parameter', () => {
    const validate = function(a, b) {
      return validator.validateComponentParameters(a, b);
    };

    describe('when component have not parameters', () => {
      const componentParameters = {},
        requestParameters = { hello: 'world' };

      it('should be valid', () => {
        expect(validate(requestParameters, componentParameters).isValid).to.be
          .true;
      });
    });

    describe('when component have not mandatory parameters', () => {
      const componentParameters = {
        name: {
          type: 'string',
          mandatory: false,
          example: 'John Doe'
        }
      };

      it('should be valid when non mandatory parameters not provided', () => {
        const requestParameters = { hello: 'world' };
        expect(validate(requestParameters, componentParameters).isValid).to.be
          .true;
      });

      it('should be valid when non mandatory parameters provided in a valid format', done => {
        const requestParameters = { name: 'Walter White' };
        expect(validate(requestParameters, componentParameters).isValid).to.be
          .true;
        done();
      });

      it('should be not valid when non mandatory parameters provided in a non valid format', () => {
        const requestParameters = { name: 12345 };

        const validateResult = validate(requestParameters, componentParameters);

        expect(validateResult.isValid).to.be.false;
        expect(validateResult.errors).not.to.be.empty;
        expect(validateResult.errors.types['name']).to.equal('wrong type');
        expect(validateResult.errors.message).to.equal(
          'Parameters are not correctly formatted: name'
        );
      });
    });

    describe('when component have mandatory parameters', () => {
      it('should not be valid when mandatory parameter not provided', () => {
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
        expect(validateResult.errors.mandatory['returnUrl']).to.equal(
          'missing'
        );
        expect(validateResult.errors.message).to.equal(
          'Expected mandatory parameters are missing: returnUrl'
        );
      });

      describe('when mandatory string parameter provided', () => {
        const componentParameters = {
          name: {
            type: 'string',
            mandatory: true,
            example: 'Walter white'
          }
        };

        it('should be valid when parameter in a valid form', () => {
          const requestParameters = { name: 'John Doe' };

          expect(validate(requestParameters, componentParameters).isValid).to.be
            .true;
        });

        it('should not be valid when parameter in a non valid form', () => {
          const requestParameters = { name: 12345 };

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['name']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal(
            'Parameters are not correctly formatted: name'
          );
        });

        it('should be valid when parameter is an empty string', () => {
          const requestParameters = { name: '' };

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.true;
        });

        describe('when non mandatory number provided', () => {
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

          it('should not be valid when provided in a non valid form', () => {
            const requestParameters = { age: 'This is not a number' };
            const validateResult = validate(
              requestParameters,
              componentParameters
            );

            expect(validateResult.isValid).to.be.false;
            expect(validateResult.errors).not.to.be.empty;
            expect(validateResult.errors.mandatory['name']).to.equal('missing');
            expect(validateResult.errors.types['age']).to.equal('wrong type');
            expect(validateResult.errors.message).to.equal(
              'Expected mandatory parameters are missing: name; Parameters are not correctly formatted: age'
            );
          });

          it('should be valid when 0', () => {
            const requestParameters = { zero: 0 };
            const validateResult = validate(
              requestParameters,
              validComponentParameters
            );

            expect(validateResult.isValid).to.be.true;
          });
        });

        describe('when non mandatory boolean provided', () => {
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

          it('should not be valid when provided in a non valid form', () => {
            const requestParameters = { isTrue: 1234 };

            const validateResult = validate(
              requestParameters,
              componentParameters
            );

            expect(validateResult.isValid).to.be.false;
            expect(validateResult.errors).not.to.be.empty;
            expect(validateResult.errors.mandatory['name']).to.equal('missing');
            expect(validateResult.errors.types['isTrue']).to.equal(
              'wrong type'
            );
            expect(validateResult.errors.message).to.equal(
              'Expected mandatory parameters are missing: name; Parameters are not correctly formatted: isTrue'
            );
          });
        });
      });

      describe('when mandatory number parameter provided', () => {
        const componentParameters = {
          age: {
            type: 'number',
            mandatory: true,
            example: 35
          }
        };

        it('should be valid when parameter in a valid form', () => {
          const requestParameters = { age: 18 };

          expect(validate(requestParameters, componentParameters).isValid).to.be
            .true;
        });

        it('should not be valid when parameter in a non valid form', () => {
          const requestParameters = { age: 'this is a string' };

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['age']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal(
            'Parameters are not correctly formatted: age'
          );
        });

        it('should not be valid when parameter is null', () => {
          const requestParameters = { age: null };

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['age']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal(
            'Parameters are not correctly formatted: age'
          );
        });
      });

      describe('when mandatory boolean parameter provided', () => {
        const componentParameters = {
          happy: {
            type: 'boolean',
            mandatory: true,
            example: true
          }
        };

        it('should be valid when parameter in a valid form', () => {
          const requestParameters = { happy: false };

          expect(validate(requestParameters, componentParameters).isValid).to.be
            .true;
        });

        it('should not be valid when parameter in a non valid form', () => {
          const requestParameters = { happy: 'this is a string' };

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal(
            'Parameters are not correctly formatted: happy'
          );
        });

        it('should not be valid when parameter is null', () => {
          const requestParameters = { happy: null };

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal(
            'Parameters are not correctly formatted: happy'
          );
        });

        it('should not be valid when parameter is undefined', () => {
          const requestParameters = { happy: undefined };

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.types['happy']).to.equal('wrong type');
          expect(validateResult.errors.message).to.equal(
            'Parameters are not correctly formatted: happy'
          );
        });

        it('should not be valid when parameter not provided', () => {
          const requestParameters = {};

          const validateResult = validate(
            requestParameters,
            componentParameters
          );

          expect(validateResult.isValid).to.be.false;
          expect(validateResult.errors).not.to.be.empty;
          expect(validateResult.errors.mandatory['happy']).to.equal('missing');
          expect(validateResult.errors.message).to.equal(
            'Expected mandatory parameters are missing: happy'
          );
        });
      });
    });
  });

  describe('when validating component name for new candidate', () => {
    const validate = function(a) {
      return validator.validateComponentName(a);
    };

    describe('when name has spaces', () => {
      const name = 'hello ha';
      it('should not be valid', () => {
        expect(validate(name)).to.be.false;
      });
    });

    describe('when name has not allowed characters', () => {
      const name = 'name@ha';
      it('should not be valid', () => {
        expect(validate(name)).to.be.false;
      });
    });

    describe('when name has alphanumeric characters, _ or -', () => {
      const name = 'hello-world_haha23';
      it('should be valid', () => {
        expect(validate(name)).to.be.true;
      });
    });

    describe('when name is reserved', () => {
      const name = '_package';
      it('should not be valid', () => {
        expect(validate(name)).to.be.false;
      });
    });
  });

  describe('when validating component version for new candidate', () => {
    const existingVersions = ['1.0.0', '1.0.1', '2.0.0', '2.1.0'],
      isValid = function(a, b) {
        return validator.validateVersion(a, b);
      };

    describe('when version already exists', () => {
      it('should not be valid', () => {
        expect(isValid('this.is.not.valid', existingVersions)).not.to.be.true;
      });
    });

    describe('when version does not exist', () => {
      it('should be valid', () => {
        expect(isValid('1.2.33', existingVersions)).to.be.true;
      });
    });
  });

  describe('when validating component package for new candidate', () => {
    const validate = (a, b) => validator.validatePackage(a, b || {});

    describe('when package not valid', () => {
      it('should not be valid when uploaded files is empty', () => {
        expect(validate({}).isValid).to.be.false;
      });

      it('should not be valid when uploaded package consists of multiple files', () => {
        expect(validate([{}, {}]).isValid).to.be.false;
      });

      it('should not be valid when file has not the proper file extension', () => {
        expect(
          validate([
            {
              fieldname: 'file.jpg',
              originalname: 'file.jpg',
              filename: 'file-1415986760368.jpg',
              encoding: '7bit',
              mimetype: 'application/octet-stream',
              path: 'temp/file-1415986760368.jpg',
              size: 123
            }
          ]).isValid
        ).to.be.false;
      });

      it('should not be valid when file has been truncated', () => {
        expect(
          validate([
            {
              fieldname: 'package.tar.gz',
              originalname: 'package.tar.gz',
              filename: 'theFile-1415986760368.tar.gz',
              encoding: '7bit',
              mimetype: 'application/octet-stream',
              path: 'temp/package-1415986760368.tar.gz',
              size: 3707,
              truncated: true
            }
          ]).isValid
        ).to.be.false;
      });

      it('should not be valid when file has wrong mimetype', () => {
        expect(
          validate([
            {
              fieldname: 'package.tar.gz',
              originalname: 'package.tar.gz',
              filename: 'theFile-1415986760368.tar.gz',
              encoding: '7bit',
              mimetype: 'application/json',
              path: 'temp/package-1415986760368.tar.gz',
              size: 3707
            }
          ]).isValid
        ).to.be.false;
      });
    });

    describe('when custom validation provided', () => {
      const validate = function(obj) {
        return validator.validatePackageJson(obj);
      };

      const customValidator = function(pkg) {
        const isValid = !!pkg.author && !!pkg.repository;
        return isValid
          ? isValid
          : { isValid: false, error: 'author and repository are required' };
      };

      describe('when package.json does not contain mandatory fields', () => {
        let result;
        beforeEach(() => {
          result = validate({
            packageJson: { name: 'my-component' },
            componentName: 'my-component',
            customValidator: customValidator
          });
        });

        it('should not be valid', () => {
          expect(result.isValid).to.be.false;
        });

        it('should return the error', () => {
          expect(result.error).to.be.equal(
            'author and repository are required'
          );
        });
      });

      describe('when package.json contains mandatory fields', () => {
        let result;
        beforeEach(() => {
          result = validate({
            packageJson: {
              name: 'my-component',
              author: 'somebody',
              repository: 'https://github.com/somebody/my-component'
            },
            componentName: 'my-component',
            customValidator: customValidator
          });
        });

        it('should be valid', () => {
          expect(result.isValid).to.be.true;
        });
      });
    });

    describe('when package is valid', () => {
      const scenarios = [
        {
          fieldname: 'package.tar.gz',
          originalname: 'package.tar.gz',
          filename: 'theFile-1415986760368.tar.gz',
          encoding: '7bit',
          mimetype: 'application/octet-stream',
          path: 'temp/package-1415986760368.tar.gz',
          size: 3707
        },
        {
          fieldname: 'package.tar.gz',
          originalname: 'package.tar.gz',
          filename: 'theFile-123456789.tar.gz',
          encoding: '7bit',
          mimetype: 'application/gzip',
          path: 'temp/package-123456789.tar.gz',
          size: 37076
        }
      ];

      _.each(scenarios, scenario => {
        it(`should be valid with mimetype ${scenario.mimetype}`, () => {
          expect(validate([scenario]).isValid).to.be.true;
        });
      });
    });
  });

  describe('when validating component plugin requirements', () => {
    const validate = validator.validatePluginsRequirements;

    describe('when component does not require any plugin', () => {
      const requirements = null,
        supportedPlugins = {
          log: function() {}
        };

      it('should be valid', () => {
        expect(validate(requirements, supportedPlugins).isValid).to.be.true;
      });
    });

    describe('when component requires plugin', () => {
      const requirements = ['getToggle'];
      describe('when registry does not support plugin', () => {
        const supportedPlugins = {
          log: function() {}
        };

        const validationResult = validate(requirements, supportedPlugins);

        it('should not be valid', () => {
          expect(validationResult.isValid).to.be.false;
        });

        it('should list missing dependencies', () => {
          expect(validationResult.missing).to.eql(['getToggle']);
        });
      });

      describe('when registry supports plugin', () => {
        const supportedPlugins = {
          getToggle: function() {
            return true;
          }
        };

        it('should be valid', () => {
          expect(validate(requirements, supportedPlugins).isValid).to.be.true;
        });
      });
    });
  });

  describe('when validating CLI OC version in request headers', () => {
    const validator = injectr('../../src/registry/domain/validators/index.js', {
      './oc-cli-version': injectr(
        '../../src/registry/domain/validators/oc-cli-version.js',
        {
          '../../../../package.json': { version: '0.16.34' }
        }
      )
    });

    const validate = function(userAgent) {
      return validator.validateOcCliVersion(userAgent);
    };

    describe('when user-agent header is not specified', () => {
      const result = validate('value');

      it('should be invalid', () => {
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', () => {
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe("when user-agent header doesn't have correct format", () => {
      const result = validate('oc-cli/1.2.3-v0.10.35-darwin-x64');

      it('should be invalid', () => {
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', () => {
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when OC CLI version in user-agent header is lower than Registry version', () => {
      const result = validate('oc-cli-0.2.3/v0.10.35-darwin-x64');

      it('should be invalid', () => {
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of CLI', () => {
        expect(result.error.suggestedVersion).to.equal('0.16.X');
      });
    });

    describe('when OC CLI version in user-agent header is equal to Registry version', () => {
      const result = validate('oc-cli-0.16.34/v0.10.35-darwin-x64');

      it('should be valid', () => {
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', () => {
        expect(result.error).to.be.undefined;
      });
    });

    describe('when OC CLI version in user-agent header is higher than Registry version', () => {
      const result = validate('oc-cli-0.16.35/v0.10.35-darwin-x64');

      it('should be valid', () => {
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', () => {
        expect(result.error).to.be.undefined;
      });
    });
  });

  describe('when validating node engine version in request headers', () => {
    const validator = injectr('../../src/registry/domain/validators/index.js', {
      './node-version': injectr(
        '../../src/registry/domain/validators/node-version.js',
        {
          '../../../../package.json': { engines: { node: '>=0.10.35' } }
        }
      )
    });

    const validate = function(userAgent) {
      return validator.validateNodeVersion(userAgent, 'v0.10.36');
    };

    describe('when user-agent header is not specified', () => {
      const result = validate('value');

      it('should be invalid', () => {
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', () => {
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe("when user-agent header doesn't have correct format", () => {
      const result = validate('oc-cli/1.2.3-v0.10.35-darwin-x64');

      it('should be invalid', () => {
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', () => {
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when node version in user-agent header is lower than Registry version of node', () => {
      const result = validate('oc-cli-0.2.3/v0.10.34-darwin-x64');

      it('should be invalid', () => {
        expect(result.isValid).to.be.false;
      });

      it('should suggest correct version of node engine', () => {
        expect(result.error.suggestedVersion).to.equal('>=0.10.35');
      });
    });

    describe('when node version in user-agent header is equal to Registry version of node', () => {
      const result = validate('oc-cli-0.16.34/v0.10.35-darwin-x64');

      it('should be valid', () => {
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', () => {
        expect(result.error).to.be.undefined;
      });
    });

    describe('when node version in user-agent header is higher than Registry version of node', () => {
      const result = validate('oc-cli-0.16.35/v0.10.36-darwin-x64');

      it('should be valid', () => {
        expect(result.isValid).to.be.true;
      });

      it('should not return an error', () => {
        expect(result.error).to.be.undefined;
      });
    });
  });
});
