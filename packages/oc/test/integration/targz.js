const expect = require('chai').expect;
const fs = require('fs-extra');
const path = require('node:path');
const targz = require('../../dist/utils/targz');

describe('The targz utility', () => {
  describe('when compressing a folder with targz', () => {
    const file = path.resolve(__dirname, '../fixtures/test.tar.gz');

    beforeEach(() => {
      const from = path.resolve(
        __dirname,
        '../fixtures/components/hello-world'
      );
      return targz.compress(from, file, 'hello-world');
    });

    it('should create the file', () => {
      expect(fs.existsSync(file)).to.be.true;
    });

    describe('when decompressing the created file', () => {
      let error;
      const to = path.resolve(__dirname, '../fixtures/targz-test');

      beforeEach(() =>
        targz.decompress(file, to).catch((err) => {
          error = err;
        })
      );

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
