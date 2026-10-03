const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : routes : helpers : get-component : linked handlebars cache', () => {
  const handlebarsTemplate = require('oc-template-handlebars');
  const hashKey = 'hb-linked-cache-key-1';
  const component = {
    package: {
      name: 'handlebars-cache-component',
      version: '1.0.0',
      oc: {
        container: false,
        renderInfo: false,
        files: {
          template: {
            type: 'oc-template-handlebars',
            hashKey,
            src: 'template.js'
          }
        }
      }
    },
    view:
      'var oc=oc||{};oc.components=oc.components||{},oc.components["' +
      hashKey +
      '"]={compiler:[8,">= 4.3.0"],main:function(){return "Hello handlebars";},useData:true};'
  };

  let GetComponent;
  let mockedRepository;

  before(() => {
    GetComponent = injectr(
      '../../dist/registry/routes/helpers/get-component.js',
      {
        '../../domain/events-handler': {
          on: () => {},
          fire: () => {},
          hasListeners: () => false
        }
      },
      { console, Buffer, clearTimeout, setTimeout, process }
    ).default;

    mockedRepository = {
      getCompiledView: sinon.stub().resolves(component.view),
      getComponent: sinon.stub().resolves(component.package),
      getTemplatesInfo: sinon.stub().returns([]),
      getTemplate: (type) =>
        type === 'oc-template-handlebars' ? handlebarsTemplate : undefined,
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  });

  describe('when rendering the same handlebars component twice', () => {
    let first;
    let second;
    let renderSpy;

    before(function (done) {
      this.timeout(20000);
      renderSpy = sinon.spy(handlebarsTemplate, 'render');
      const getComponent = GetComponent({}, mockedRepository);
      const options = {
        name: 'handlebars-cache-component',
        headers: {},
        parameters: {},
        version: '1.0.0',
        conf: { baseUrl: 'http://components.com/' }
      };

      getComponent(options, (result) => {
        first = result;
        getComponent(options, (result2) => {
          second = result2;
          done();
        });
      });
    });

    after(() => {
      renderSpy.restore();
    });

    it('should render html on both requests', () => {
      expect(first.status).to.equal(200);
      expect(second.status).to.equal(200);
      expect(first.response.html).to.contain('Hello handlebars');
      expect(second.response.html).to.equal(first.response.html);
    });

    it('should run the upstream template-link step only once', () => {
      expect(renderSpy.callCount).to.equal(1);
    });
  });
});
