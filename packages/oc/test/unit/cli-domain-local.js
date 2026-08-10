const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

const initialise = () => {
  const deprecate = sinon.stub();
  const initTemplate = sinon.stub().resolves({ ok: true });
  const Local = injectr(
    '../../dist/cli/domain/local.js',
    {
      '../../registry/domain/validators': {
        validateComponentName: sinon.stub().returns(true)
      },
      '../../utils/deprecate': { __esModule: true, default: deprecate },
      './clean': {},
      './get-components-by-dir': () => ({}),
      './init-template': initTemplate,
      './mock': () => ({}),
      './package-components': () => () => ({})
    },
    {}
  ).default;

  return {
    deprecate,
    initTemplate,
    local: Local()
  };
};

const initOptions = (templateType) => ({
  componentName: 'new-component',
  componentPath: '/path/to/new-component',
  logger: { warn: sinon.spy() },
  templateType
});

describe('cli : domain : local', () => {
  for (const [legacyType, templateType] of [
    ['jade', 'oc-template-jade'],
    ['handlebars', 'oc-template-handlebars']
  ]) {
    describe(`when initialising with bare ${legacyType}`, () => {
      let data;

      beforeEach(async () => {
        data = initialise();
        await data.local.init(initOptions(legacyType));
      });

      it('emits a deprecation notice pointing to the modern runtime', () => {
        expect(data.deprecate.calledOnce).to.be.true;
        expect(data.deprecate.args[0][0]).to.deep.include({
          id: `cli-init-legacy-template-${legacyType}`,
          subject: `The bare \`${legacyType}\` template type`,
          replacement:
            'the modern ESM component runtime (`oc-template-es6`)'
        });
      });

      it('keeps scaffolding on the package-backed legacy template', () => {
        expect(data.initTemplate.args[0][0]).to.include({
          compiler: `${templateType}-compiler`,
          templateType
        });
      });
    });
  }

  for (const templateType of [
    'oc-template-jade',
    'oc-template-handlebars'
  ]) {
    describe(`when initialising with ${templateType}`, () => {
      let data;

      beforeEach(async () => {
        data = initialise();
        await data.local.init(initOptions(templateType));
      });

      it('does not emit the legacy deprecation notice', () => {
        expect(data.deprecate.called).to.be.false;
      });

      it('keeps the selected template and compiler unchanged', () => {
        expect(data.initTemplate.args[0][0]).to.include({
          compiler: `${templateType}-compiler`,
          templateType
        });
      });
    });
  }
});
