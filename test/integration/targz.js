const expect = require('chai').expect;
const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');
const targz = require('targz');

describe('The targz dependency', () => {
  describe('when compressing a folder with targz', () => {
    const file = path.resolve(__dirname, '../fixtures/test.tar.gz');

    beforeEach((done) => {
      const from = path.resolve(
        __dirname,
        '../fixtures/components/hello-world'
      );
      targz.compress(
        {
          src: from,
          dest: file,
          tar: {
            map: (fileName) => ({
              ...fileName,
              name: 'hello-world/' + fileName.name
            })
          }
        },
        done
      );
    });

    it('should create the file', () => {
      expect(existsSync(file));
    });

    describe('when decompressing the created file', () => {
      let error;
      const to = path.resolve(__dirname, '../fixtures/targz-test');

      beforeEach((done) => {
        targz.decompress(
          {
            src: file,
            dest: to
          },
          (err) => {
            error = err;
            done();
          }
        );
      });

      it('should throw no error', () => {
        expect(!!error).to.be.false;
      });

      it('should contain the files', () => {
        expect(existsSync(to)).to.be.true;
        expect(
          readFileSync(path.join(to, 'hello-world/template.html')).toString()
        ).to.be.equal('Hello world!');
      });
    });
  });
});
