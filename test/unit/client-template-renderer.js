'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');

describe('client : template-renderer', () => {

  let templateRenderer, error, result;

  const next = (done) => (err, res) => {
    error = err;
    result = res;
    done();
  };

  const initialise = (err, res, exception) => {

    const TemplateRenderer = injectr('../../client/src/template-renderer.js', {
      './utils/require-template': () => ({
        render: (x, cb) => {
          if(exception){ throw exception; }
          cb(err, res);
        }
      }),
      './html-renderer': ({
        renderedComponent: x => `<transformed>${x.html}</transformed>`
      })
    }, { console });

    templateRenderer = new TemplateRenderer();
  };

  describe('when rendering template succeeds', () => {

    beforeEach((done) => {
      initialise(null, '<div>hello</div>');
      templateRenderer(null, null, { templateType: 'blargh' }, next(done));
    });

    it('should not error', () => {
      expect(error).to.be.null;
    });

    it('should return transformed result', () => {
      expect(result).to.equal('<transformed><div>hello</div></transformed>');
    });
  });

  describe('when rendering template fails', () => {

    beforeEach((done) => {
      initialise(new Error('blabla'));
      templateRenderer(null, null, { templateType: 'blargh' }, next(done));
    });

    it('should return error', () => {
      expect(error.toString()).to.contain('blabla');
    });
  });

  describe('when rendering template throws an error', () => {

    beforeEach((done) => {
      initialise(null, null, new Error('exception'));
      templateRenderer(null, null, { templateType: 'blargh' }, next(done));
    });

    it('should catch and return error', () => {
      expect(error.toString()).to.contain('exception');
    });
  });
});