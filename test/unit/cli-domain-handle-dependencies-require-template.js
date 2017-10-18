'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

describe('cli : domain : handle-dependencies : require-template', () => {
  const isTemplateValid = sinon.stub().returns(true);

  let result, error;
  const execute = options => {
    error = null;
    result = null;
    const requireTemplate = injectr(
      '../../src/cli/domain/handle-dependencies/require-template.js',
      {
        '../../../utils/clean-require': options.requireMock,
        '../../../utils/is-template-valid':
          options.isTemplateValidMock || sinon.stub().returns(true),
        path: {
          join: (...args) => args.join('/').replace(/\/\//gi, '/'),
          resolve: (...args) =>
            ['path/to/oc-cli'].concat(args.slice(1)).join('/')
        }
      },
      {
        __dirname: '__dirname'
      }
    );
    try {
      result = requireTemplate(options.template, options.options);
    } catch (e) {
      error = e;
    }
  };

  describe('when requiring template', () => {
    describe('when module not found', () => {
      const requireMock = sinon.stub().returns(undefined);
      beforeEach(() =>
        execute({
          requireMock,
          template: 'oc-template-jade',
          options: { componentPath: '/path/to/component' }
        })
      );

      it('should try requiring from component folder first', () => {
        expect(requireMock.args[0][0]).to.equal(
          '/path/to/component/node_modules/oc-template-jade'
        );
      });

      it('should try requiring it as absolute as second attempt', () => {
        expect(requireMock.args[1][0]).to.equal('oc-template-jade');
      });

      it('should try requiring it relatively to the oc runtime as third attempt', () => {
        expect(requireMock.args[2][0]).to.equal(
          '__dirname/../../node_modules/oc-template-jade'
        );
      });

      it('should try requiring it relatively to the oc cli as fourth attempt', () => {
        expect(requireMock.args[3][0]).to.equal(
          'path/to/oc-cli/node_modules/oc-template-jade'
        );
      });

      it('should then throw an exeption', () => {
        expect(error.toString()).to.contain(
          'Error requiring oc-template: "oc-template-jade" not found'
        );
      });
    });

    describe('when template is legacy (jade)', () => {
      const requireMock = sinon.stub().returns({
        thisIsAValidTemplate: true
      });
      beforeEach(() =>
        execute({
          requireMock,
          template: 'jade',
          options: { componentPath: '/path/to/component' }
        })
      );

      it('should require the oc-template-jade instead', () => {
        expect(requireMock.args[0][0]).to.equal(
          '/path/to/component/node_modules/oc-template-jade'
        );
      });

      it('should return the template', () => {
        expect(result).to.deep.equal({
          thisIsAValidTemplate: true
        });
      });
    });

    describe('when template is legacy (handlebars)', () => {
      const requireMock = sinon.stub().returns({
        thisIsAValidTemplate: true
      });
      beforeEach(() =>
        execute({
          requireMock,
          template: 'handlebars',
          options: { componentPath: '/path/to/component' }
        })
      );

      it('should require the oc-template-handlebars instead', () => {
        expect(requireMock.args[0][0]).to.equal(
          '/path/to/component/node_modules/oc-template-handlebars'
        );
      });

      it('should return the template', () => {
        expect(result).to.deep.equal({
          thisIsAValidTemplate: true
        });
      });
    });

    describe('when requiring a compiler (oc-template-react)', () => {
      const requireMock = sinon.stub().returns({
        thisIsAValidTemplate: true
      });
      beforeEach(() =>
        execute({
          requireMock,
          template: 'oc-template-react',
          options: { componentPath: '/path/to/component', compiler: true }
        })
      );

      it('should require the oc-template-react-compiler', () => {
        expect(requireMock.args[0][0]).to.equal(
          '/path/to/component/node_modules/oc-template-react-compiler'
        );
      });

      it('should return the template', () => {
        expect(result).to.deep.equal({
          thisIsAValidTemplate: true
        });
      });
    });

    describe("when module found in the component's folder", () => {
      describe('when the template is valid', () => {
        const requireMock = sinon.stub().returns({
          thisIsAValidTemplate: true
        });
        beforeEach(() =>
          execute({
            requireMock,
            template: 'oc-template-jade',
            options: { componentPath: '/path/to/component' }
          })
        );

        it('should return the template', () => {
          expect(result).to.deep.equal({
            thisIsAValidTemplate: true
          });
        });
      });

      describe('when the template is not valid', () => {
        const requireMock = sinon.stub().returns({
          thisIsAValidTemplate: true
        });
        const isTemplateValidMock = sinon.stub().returns(false);
        beforeEach(() =>
          execute({
            requireMock,
            isTemplateValidMock,
            template: 'oc-template-jade',
            options: { componentPath: '/path/to/component' }
          })
        );

        it('should throw an error', () => {
          expect(error.toString()).to.contain(
            'Error requiring oc-template: "oc-template-jade" is not a valid oc-template'
          );
        });
      });
    });
  });
});
