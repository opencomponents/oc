'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const path = require('path');
const sinon = require('sinon');
const _ = require('lodash');

describe('cli : domain : package-static-files', () => {

  let packageStaticFiles,
    error,
    mocks,
    minifyMocks;

  const initialise = function(mocks, params, cb){
    packageStaticFiles = injectr('../../src/cli/domain/package-static-files/index.js', mocks, { console: console });
    packageStaticFiles(params, (e) => {
      error = e;
      cb();
    });
  };

  const cleanup = function(){
    error = null;

    minifyMocks = {
      'babel-core': {
        transform: sinon.stub().returns({
          code: 'this-is-transpiled'
        })
      },
      'clean-css': sinon.stub().returns({
        minify: function(){
          return { styles: 'this-is-minified'};
        }
      }),
      'uglify-js': {
        minify: sinon.stub().returns({
          code: 'this-is-minified'
        })
      }
    };

    mocks = {
      './minify-file': injectr('../../src/cli/domain/package-static-files/minify-file.js', minifyMocks),
      'fs-extra': {
        copySync: sinon.spy(),
        ensureDirSync: sinon.spy(),
        existsSync: sinon.stub().returns(true),
        lstatSync: sinon.stub().returns({
          isDirectory: function(){ return true; }
        }),
        readFileSync: sinon.stub().returns('some content'),
        writeFileSync: sinon.spy()
      },
      'node-dir': { paths: sinon.stub().yields(null, { files:[] })},
      path: {
        basename: path.basename,
        dirname: function(){
          return path.dirname.apply(this, _.toArray(arguments)).replace(/\\/g, '/');
        },
        extname: path.extname,
        join: function(){
          return path.join.apply(this, _.toArray(arguments)).replace(/\\/g, '/');
        },
        relative: function(){
          return path.relative.apply(this, _.toArray(arguments)).replace(/\\/g, '/');
        },
        resolve: function(){
          return _.toArray(arguments).join('/');
        }
      }
    };
  };

  cleanup();

  describe('when oc.files.static is empty', () => {

    beforeEach((done) => {
      initialise(mocks, {
        componentPath: '/path/to/component',
        minify: false,
        ocOptions: { files: { static: [] }},
        publishPath: '/path/to/component/_package'
      }, done);
    });

    afterEach(cleanup);

    it('should do nothing', () => {
      expect(mocks['fs-extra'].copySync.called).to.be.false;
      expect(mocks['fs-extra'].writeFileSync.called).to.be.false;
    });
  });

  describe('when oc.files.static contains not valid folder', () => {

    describe('when folder does not exist', () => {

      beforeEach((done) => {
        mocks['fs-extra'].existsSync = sinon.stub().returns(false);

        initialise(mocks, {
          componentPath: '/path/to/component',
          minify: false,
          ocOptions: { files: { static: [ 'thisDoesNotExist' ]}},
          publishPath: '/path/to/component/_package'
        }, done);
      });

      afterEach(cleanup);

      it('should do nothing', () => {
        expect(mocks['fs-extra'].copySync.called).to.be.false;
        expect(mocks['fs-extra'].writeFileSync.called).to.be.false;
        expect(error).to.equal('"/path/to/component/thisDoesNotExist" not found');
      });
    });

    describe('when folder is not a folder', () => {

      beforeEach((done) => {
        mocks['fs-extra'].lstatSync = sinon.stub().returns({
          isDirectory: function(){ return false; }
        });

        initialise(mocks, {
          componentPath: '/path/to/component',
          minify: false,
          ocOptions: { files: { static: [ 'thisDoesNotExist' ]}},
          publishPath: '/path/to/component/_package'
        }, done);
      });

      afterEach(cleanup);

      it('should do nothing', () => {
        expect(mocks['fs-extra'].copySync.called).to.be.false;
        expect(mocks['fs-extra'].writeFileSync.called).to.be.false;
        expect(error).to.equal('"/path/to/component/thisDoesNotExist" must be a directory');
      });
    });
  });

  describe('when oc.files.static contains valid folder', () => {

    describe('when copying folder with image', () => {
      beforeEach((done) => {
        mocks['node-dir'].paths.yields(null, {
          files: ['/path/to/component/img/file.png']
        });

        initialise(mocks, {
          componentPath: '/path/to/component',
          minify: false,
          ocOptions: { files: { static: [ 'img' ]}},
          publishPath: '/path/to/component/_package'
        }, done);
      });

      afterEach(cleanup);

      it('should not get an error', () => {
        expect(error).to.be.null;
      });

      it('should copy the file in the folder', () => {
        expect(mocks['fs-extra'].copySync.calledOnce).to.be.true;
      });

      it('should copy the file to the right destination', () => {
        expect(mocks['fs-extra'].copySync.args[0][1]).to.equal('/path/to/component/_package/img/file.png');
      });
    });

    describe('when copying folder with sub-folders', () => {
      beforeEach((done) => {
        mocks['node-dir'].paths.yields(null, {
          files: [
            '/path/to/component/img/file.png',
            '/path/to/component/img/subfolder/file2.png'
          ]
        });

        initialise(mocks, {
          componentPath: '/path/to/component',
          minify: false,
          ocOptions: { files: { static: [ 'img' ]}},
          publishPath: '/path/to/component/_package'
        }, done);
      });

      afterEach(cleanup);

      it('should not get an error', () => {
        expect(error).to.be.null;
      });

      it('should copy the files to the folder', () => {
        expect(mocks['fs-extra'].copySync.calledTwice).to.be.true;
      });

      it('should copy the files to the right destinations', () => {
        expect(mocks['fs-extra'].copySync.args[0][1]).to.equal('/path/to/component/_package/img/file.png');
        expect(mocks['fs-extra'].copySync.args[1][1]).to.equal('/path/to/component/_package/img/subfolder/file2.png');
      });
    });

    describe('when copying folder with js file', () => {

      beforeEach(() => {
        mocks['node-dir'].paths.yields(null, {
          files: ['/path/to/component/js/file.js']
        });
      });

      afterEach(cleanup);

      describe('when minify=false', () => {
        beforeEach((done) => {
          initialise(mocks, {
            componentPath: '/path/to/component',
            minify: false,
            ocOptions: { files: { static: [ 'js' ]}},
            publishPath: '/path/to/component/_package'
          }, done);
        });

        it('should not get an error', () => {
          expect(error).to.be.null;
        });

        it('should copy the file in the folder', () => {
          expect(mocks['fs-extra'].copySync.calledOnce).to.be.true;
        });

        it('should copy the file to the right destination', () => {
          expect(mocks['fs-extra'].copySync.args[0][1]).to.equal('/path/to/component/_package/js/file.js');
        });
      });

      describe('when minify=true', () => {
        beforeEach((done) => {
          initialise(mocks, {
            componentPath: '/path/to/component',
            minify: true,
            ocOptions: { files: { static: [ 'js' ]}},
            publishPath: '/path/to/component/_package'
          }, done);
        });

        it('should not get an error', () => {
          expect(error).to.be.null;
        });

        it('should first transpile and minify the file', () => {
          const transformMock = minifyMocks['babel-core'].transform;
          expect(mocks['fs-extra'].readFileSync.calledOnce).to.be.true;
          expect(transformMock.calledOnce).to.be.true;
          expect(transformMock.args[0][1].presets[0][1].targets.uglify).to.be.true;
        });

        it('should then minify the file', () => {
          expect(minifyMocks['uglify-js'].minify.calledOnce).to.be.true;
        });

        it('should save the file in the folder', () => {
          expect(mocks['fs-extra'].writeFileSync.calledOnce).to.be.true;
        });

        it('should save the file minified', () => {
          expect(mocks['fs-extra'].writeFileSync.args[0][1]).to.equal('this-is-minified');
        });

        it('should save the file to the right destination', () => {
          expect(mocks['fs-extra'].writeFileSync.args[0][0]).to.equal('/path/to/component/_package/js/file.js');
        });
      });
    });

    describe('when copying folder with css file', () => {

      beforeEach(() => {
        mocks['node-dir'].paths.yields(null, {
          files: ['/path/to/component/css/file.css']
        });
      });

      afterEach(cleanup);

      describe('when minify=false', () => {
        beforeEach((done) => {
          initialise(mocks, {
            componentPath: '/path/to/component',
            minify: false,
            ocOptions: { files: { static: [ 'css' ]}},
            publishPath: '/path/to/component/_package'
          }, done);
        });

        it('should not get an error', () => {
          expect(error).to.be.null;
        });

        it('should copy the file in the folder', () => {
          expect(mocks['fs-extra'].copySync.calledOnce).to.be.true;
        });

        it('should copy the file to the right destination', () => {
          expect(mocks['fs-extra'].copySync.args[0][1]).to.equal('/path/to/component/_package/css/file.css');
        });
      });

      describe('when minify=true', () => {
        beforeEach((done) => {
          initialise(mocks, {
            componentPath: '/path/to/component',
            minify: true,
            ocOptions: { files: { static: [ 'css' ]}},
            publishPath: '/path/to/component/_package'
          }, done);
        });

        afterEach(cleanup);

        it('should not get an error', () => {
          expect(error).to.be.null;
        });

        it('should first minify the file', () => {
          expect(mocks['fs-extra'].readFileSync.calledOnce).to.be.true;
          expect(minifyMocks['clean-css'].calledOnce).to.be.true;
        });

        it('should save the file in the folder', () => {
          expect(mocks['fs-extra'].writeFileSync.calledOnce).to.be.true;
        });

        it('should save the file minified', () => {
          expect(mocks['fs-extra'].writeFileSync.args[0][1]).to.equal('this-is-minified');
        });

        it('should save the file to the right destination', () => {
          expect(mocks['fs-extra'].writeFileSync.args[0][0]).to.equal('/path/to/component/_package/css/file.css');
        });
      });
    });
  });
});