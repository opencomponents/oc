'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');

describe('registry : domain : s3', () => {
  let s3, mockedS3Client, error, response;

  const S3 = injectr('../../src/registry/domain/s3.js', {
    'fs-extra': {
      createReadStream: sinon.stub().returns('this is a stream'),
      readFile: sinon.stub().yields(null, 'file content!')
    },
    'aws-sdk': {
      config: { update: sinon.stub() },
      S3: class {
        constructor() {
          return mockedS3Client;
        }
      }
    },
    'node-dir': {
      paths: (input, cb) => {
        const sep = path.sep;
        cb(null, {
          files: [
            `/absolute-path-to-dir${sep}package.json`,
            `/absolute-path-to-dir${sep}server.js`,
            `/absolute-path-to-dir${sep}template.js`
          ]
        });
      }
    }
  });

  const initialise = () => {
    mockedS3Client = {
      getObject: sinon.stub(),
      listObjects: sinon.stub(),
      upload: sinon.stub()
    };

    s3 = new S3({
      cache: { refreshInterval: 60 },
      storage: {
        options: {
          bucket: 'test-bucket',
          path: '//s3.amazonaws.com/test-bucket/'
        }
      }
    });
  };

  const execute = (method, path, callback) => {
    error = response = undefined;
    s3[method](path, (err, res) => {
      error = err;
      response = res;
      callback();
    });
  };

  const initialiseAndExecutePut = (fileName, isPrivate, callback) => {
    initialise();
    const send = sinon.stub().yields(null, 'ok');
    mockedS3Client.upload.returns({ send });
    s3.putFile('/path/to/', fileName, isPrivate, (err, res) => {
      error = err;
      response = res;
      callback();
    });
  };

  const initialiseAndExecutePutDir = callback => {
    initialise();
    const send = sinon.stub().yields(null, 'ok');
    mockedS3Client.upload.returns({ send });
    s3.putDir(
      '/absolute-path-to-dir',
      'components\\componentName\\1.0.0',
      (err, res) => {
        error = err;
        response = res;
        callback();
      }
    );
  };

  const initialiseAndExecutePutDirWithError = callback => {
    initialise();
    const send = sinon.stub().yields({
      code: 1234,
      message: 'an error message',
      retryable: true,
      statusCode: 500,
      time: new Date(),
      hostname: 'hostname',
      region: 'us-west2'
    });

    mockedS3Client.upload.returns({ send });
    s3.putDir(
      '/absolute-path-to-dir',
      'components\\componentName\\1.0.0',
      (err, res) => {
        error = err;
        response = res;
        callback();
      }
    );
  };

  describe('when bucket is empty', () => {
    describe("when trying to access a path that doesn't exist", () => {
      before(done => {
        initialise();
        mockedS3Client.listObjects.yields(null, {
          CommonPrefixes: []
        });

        execute('listSubDirectories', 'hello', done);
      });

      it('should respond with an error', () => {
        expect(error).not.to.be.empty;
        expect(error.code).to.equal('dir_not_found');
        expect(error.msg).to.equal('Directory "hello" not found');
      });
    });
  });

  describe('when bucket contains files and directories', () => {
    describe('when getting a list of directories', () => {
      before(done => {
        initialise();
        mockedS3Client.listObjects.yields(null, {
          CommonPrefixes: [
            {
              Prefix: 'components/hello-world/'
            },
            {
              Prefix: 'components/image/'
            }
          ]
        });

        execute('listSubDirectories', 'components', done);
      });

      it('should respond without an error', () => {
        expect(error).to.be.null;
      });

      it('should respond with the list of directories', () => {
        expect(response).to.eql(['hello-world', 'image']);
      });
    });

    describe('when getting a list of subdirectories', () => {
      before(done => {
        initialise();
        mockedS3Client.listObjects.yields(null, {
          CommonPrefixes: [
            {
              Prefix: 'components/image/1.0.0/'
            },
            {
              Prefix: 'components/image/1.0.1/'
            }
          ]
        });

        execute('listSubDirectories', 'components/image', done);
      });

      it('should respond without an error', () => {
        expect(error).to.be.null;
      });

      it('should respond with the list of subdirectories', () => {
        expect(response).to.eql(['1.0.0', '1.0.1']);
      });
    });

    describe("when getting a file's content", () => {
      describe('when the file exists', () => {
        before(done => {
          initialise();
          mockedS3Client.getObject.yields(null, { Body: 'Hello!' });
          execute('getFile', 'components/image/1.0.1/src/hello.txt', done);
        });

        it('should respond without an error', () => {
          expect(error).to.be.null;
        });

        it('should respond with the file content', () => {
          expect(response).not.to.be.empty;
          expect(response).to.eql('Hello!');
        });
      });

      describe('when the file does not exists', () => {
        before(done => {
          initialise();
          mockedS3Client.getObject.yields({ code: 'NoSuchKey' });
          execute('getFile', 'components/image/1.0.1/random-file.json', done);
        });

        it('should respond with a proper error', () => {
          expect(error).not.to.be.empty;
          expect(error.code).to.equal('file_not_found');
          expect(error.msg).to.equal(
            'File "components/image/1.0.1/random-file.json" not found'
          );
        });
      });
    });

    describe("when getting a json file's content", () => {
      describe('when the file exists', () => {
        before(done => {
          initialise();
          mockedS3Client.getObject.yields(null, {
            Body: JSON.stringify({ hello: 'world' })
          });
          execute('getJson', 'components/image/1.0.1/src/hello.json', done);
        });

        it('should respond without an error', () => {
          expect(error).to.be.null;
        });

        it('should respond with the parsed file content', () => {
          expect(response).not.to.be.empty;
          expect(response).to.eql({ hello: 'world' });
        });
      });

      describe('when the file does not exists', () => {
        before(done => {
          initialise();
          mockedS3Client.getObject.yields({ code: 'NoSuchKey' });
          execute('getJson', 'components/image/1.0.1/one-file.json', done);
        });

        it('should respond with a proper error', () => {
          expect(error).not.to.be.empty;
          expect(error.code).to.equal('file_not_found');
          expect(error.msg).to.equal(
            'File "components/image/1.0.1/one-file.json" not found'
          );
        });
      });

      describe('when the file is not valid', () => {
        before(done => {
          initialise();
          mockedS3Client.getObject.yields(null, { Body: 'no-json' });
          execute('getJson', 'components/image/1.0.2/random-file.json', done);
        });

        it('should respond with a proper error', () => {
          expect(error).not.to.be.empty;
          expect(error.code).to.equal('file_not_valid');
          expect(error.msg).to.equal(
            'File "components/image/1.0.2/random-file.json" not valid'
          );
        });
      });
    });
  });

  describe('when publishing directory', () => {
    describe('on success', () => {
      before(done => initialiseAndExecutePutDir(done));

      it('should save all the files', () => {
        expect(mockedS3Client.upload.args.length).to.equal(3);
      });

      it('should save the files using unix-styled path for s3 output locations', () => {
        expect(mockedS3Client.upload.args[0][0].Key).to.eql(
          'components/componentName/1.0.0/package.json'
        );
        expect(mockedS3Client.upload.args[1][0].Key).to.eql(
          'components/componentName/1.0.0/server.js'
        );
        expect(mockedS3Client.upload.args[2][0].Key).to.eql(
          'components/componentName/1.0.0/template.js'
        );
      });
    });

    describe('on failure', () => {
      before(done => initialiseAndExecutePutDirWithError(done));

      it('should get the error', () => {
        expect(error.message).to.equal('an error message');
      });
    });
  });

  describe('when publishing file', () => {
    describe('when putting private file', () => {
      before(done => {
        initialiseAndExecutePut('hello.txt', true, done);
      });

      it('should be saved using authenticated-read ACL', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ACL).to.equal('authenticated-read');
      });
    });

    describe('when putting public file', () => {
      before(done => {
        initialiseAndExecutePut('hello.txt', false, done);
      });

      it('should be saved using public-read ACL', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ACL).to.equal('public-read');
      });
    });

    describe('when putting js file', () => {
      before(done => {
        initialiseAndExecutePut('hello.js', false, done);
      });

      it('should be saved using application/javascript Content-Type', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentType).to.equal('application/javascript');
      });
    });

    describe('when putting gzipped js file', () => {
      before(done => {
        initialiseAndExecutePut('hello.js.gz', false, done);
      });

      it('should be saved using application/javascript Content-Type', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentType).to.equal('application/javascript');
      });

      it('should be saved using gzip Content Content-Encoding', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentEncoding).to.equal('gzip');
      });
    });

    describe('when putting css file', () => {
      before(done => {
        initialiseAndExecutePut('hello.css', false, done);
      });

      it('should be saved using text/css Content-Type', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentType).to.equal('text/css');
      });
    });

    describe('when putting gzipped css file', () => {
      before(done => {
        initialiseAndExecutePut('hello.css.gz', false, done);
      });

      it('should be saved using text/css Content-Type', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentType).to.equal('text/css');
      });

      it('should be saved using text/css Content-Encoding', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentEncoding).to.equal('gzip');
      });
    });

    describe('when putting jpg file', () => {
      before(done => {
        initialiseAndExecutePut('hello.jpg', false, done);
      });

      it('should be saved using image/jpeg Content-Type', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentType).to.equal('image/jpeg');
      });
    });

    describe('when putting gif file', () => {
      before(done => {
        initialiseAndExecutePut('hello.gif', false, done);
      });

      it('should be saved using image/gif Content-Type', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentType).to.equal('image/gif');
      });
    });

    describe('when putting png file', () => {
      before(done => {
        initialiseAndExecutePut('hello.png', false, done);
      });

      it('should be saved using image/png fileType', () => {
        const params = mockedS3Client.upload.args;
        expect(params[0][0].ContentType).to.equal('image/png');
      });
    });
  });
});
