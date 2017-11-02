'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const path = require('path');
const targz = require('targz');
const _ = require('lodash');

describe('The targz dependency', () => {
  describe('when compressing a folder with targz', () => {
    const file = path.resolve(__dirname, '../fixtures/test.tar.gz');

    beforeEach(done => {
      const from = path.resolve(
        __dirname,
        '../fixtures/components/hello-world'
      );
      targz.compress(
        {
          src: from,
          dest: file,
          tar: {
            map: function(fileName) {
              return _.extend(fileName, {
                name: 'hello-world/' + fileName.name
              });
            }
          }
        },
        done
      );
    });

    it('should create the file', () => {
      expect(fs.existsSync(file));
    });

    describe('when decompressing the created file', () => {
      let error;
      const to = path.resolve(__dirname, '../fixtures/targz-test');

      beforeEach(done => {
        targz.decompress(
          {
            src: file,
            dest: to
          },
          err => {
            error = err;
            done();
          }
        );
      });

      it('should throw no error', () => {
        expect(!!error).to.be.false;
      });

      it('should contain the files', () => {
        expect(fs.existsSync(to)).to.be.true;
        expect(
          fs.readFileSync(path.join(to, 'hello-world/template.html')).toString()
        ).to.be.equal('Hello world!');
      });
    });
  });
});
