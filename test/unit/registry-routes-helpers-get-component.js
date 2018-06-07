'use strict';

const Client = require('oc-client');
const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');
const _ = require('lodash');

describe('registry : routes : helpers : get-component', () => {
  const mockedComponents = require('../fixtures/mocked-components');
  let fireStub, mockedRepository, GetComponent;
  const templates = {
    'oc-template-jade': require('oc-template-jade'),
    'oc-template-handlebars': require('oc-template-handlebars')
  };
  const initialise = function(params) {
    fireStub = sinon.stub();
    GetComponent = injectr(
      '../../src/registry/routes/helpers/get-component.js',
      {
        '../../domain/events-handler': {
          on: _.noop,
          fire: fireStub
        },
        'oc-client': function() {
          const client = new Client();
          return {
            renderTemplate: (template, data, renderOptions, cb) => {
              if (renderOptions.templateType === 'oc-template-supported') {
                renderOptions.templateType = 'oc-template-jade';
              }
              return client.renderTemplate(template, data, renderOptions, cb);
            }
          };
        }
      },
      { console, Buffer, setTimeout }
    );

    mockedRepository = {
      getCompiledView: sinon.stub().yields(null, params.view),
      getComponent: sinon.stub().yields(null, params.package),
      getDataProvider: sinon
        .stub()
        .yields(null, { content: params.data, filePath: '/path/to/server.js' }),
      getTemplatesInfo: sinon.stub().returns([
        {
          type: 'oc-template-jade',
          version: '6.0.1',
          externals: []
        },
        {
          type: 'oc-template-handlebars',
          version: '6.0.2',
          externals: []
        },
        {
          type: 'oc-template-supported',
          version: '1.2.3',
          externals: []
        }
      ]),
      getTemplate: type =>
        type === 'oc-template-supported'
          ? templates['oc-template-jade']
          : templates[type],
      getStaticFilePath: sinon.stub().returns('//my-cdn.com/files/')
    };
  };

  describe('when getting a component with success', () => {
    before(done => {
      initialise(mockedComponents['async-error2-component']);
      const getComponent = GetComponent({}, mockedRepository);

      getComponent(
        {
          name: 'async-error2-component',
          headers: {},
          parameters: {},
          version: '1.X.X',
          conf: { baseUrl: 'http://components.com/' }
        },
        () => done()
      );
    });

    it('should fire a component-retrieved event', () => {
      expect(fireStub.args[0][0]).to.equal('component-retrieved');
      expect(fireStub.args[0][1].headers).to.eql({});
      expect(fireStub.args[0][1].name).to.equal('async-error2-component');
      expect(fireStub.args[0][1].parameters).to.eql({});
      expect(fireStub.args[0][1].requestVersion).to.equal('1.X.X');
      expect(fireStub.args[0][1].href).to.equal(
        'http://components.com/async-error2-component/1.X.X'
      );
      expect(fireStub.args[0][1].version).to.equal('1.0.0');
      expect(fireStub.args[0][1].renderMode).to.equal('rendered');
      expect(fireStub.args[0][1].duration).to.be.above(0);
      expect(fireStub.args[0][1].status).to.equal(200);
    });
  });

  describe('when getting a component with failure', () => {
    before(done => {
      initialise(mockedComponents['async-error2-component']);
      const getComponent = GetComponent({}, mockedRepository);

      getComponent(
        {
          name: 'async-error2-component',
          headers: {},
          parameters: { error: true },
          version: '1.X.X',
          conf: { baseUrl: 'http://components.com/' }
        },
        () => done()
      );
    });

    it('should fire a component-retrieved event', () => {
      expect(fireStub.args[0][0]).to.equal('component-retrieved');
      expect(fireStub.args[0][1].headers).to.eql({});
      expect(fireStub.args[0][1].name).to.equal('async-error2-component');
      expect(fireStub.args[0][1].parameters).to.eql({ error: true });
      expect(fireStub.args[0][1].requestVersion).to.equal('1.X.X');
      expect(fireStub.args[0][1].href).to.equal(
        'http://components.com/async-error2-component/1.X.X?error=true'
      );
      expect(fireStub.args[0][1].version).to.equal('1.0.0');
      expect(fireStub.args[0][1].renderMode).to.equal('rendered');
      expect(fireStub.args[0][1].duration).to.be.above(0);
      expect(fireStub.args[0][1].status).to.equal(500);
    });
  });

  describe('when rendering a component with a legacy template', () => {
    describe("when oc-client requests an unrendered component and it doesn't provide templates header", () => {
      const headers = {
        'user-agent': 'oc-client-0/0-0-0',
        accept: 'application/vnd.oc.unrendered+json'
      };
      let callBack;

      before(done => {
        initialise(mockedComponents['async-error2-component']);
        const getComponent = GetComponent({}, mockedRepository);
        callBack = sinon.spy(() => done());
        getComponent(
          {
            name: 'async-error2-component',
            headers,
            parameters: {},
            version: '1.X.X',
            conf: { baseUrl: 'http://components.com/' }
          },
          callBack
        );
      });

      it('should return the unrendered version', () => {
        expect(callBack.args[0][0].response.html).to.equal(undefined);
        expect(callBack.args[0][0].response.template).to.deep.equal({
          key: '8c1fbd954f2b0d8cd5cf11c885fed4805225749f',
          src: '//my-cdn.com/files/',
          type: 'jade'
        });
        expect(callBack.args[0][0].response.renderMode).to.equal('unrendered');
        expect(fireStub.args[0][1].renderMode).to.equal('unrendered');
      });
    });

    describe('when oc-client requests an unrendered component and it supports the correct template', () => {
      const headers = {
        'user-agent': 'oc-client-0/0-0-0',
        templates: 'oc-template-jade,6.0.1;oc-template-handlebars,6.0.2',
        accept: 'application/vnd.oc.unrendered+json'
      };
      let callBack;

      before(done => {
        initialise(mockedComponents['async-error2-component']);
        const getComponent = GetComponent({}, mockedRepository);
        callBack = sinon.spy(() => done());
        getComponent(
          {
            name: 'async-error2-component',
            headers,
            parameters: {},
            version: '1.X.X',
            conf: { baseUrl: 'http://components.com/' }
          },
          callBack
        );
      });

      it('should return the unrendered version', () => {
        expect(callBack.args[0][0].response.html).to.equal(undefined);
        expect(callBack.args[0][0].response.template).to.deep.equal({
          key: '8c1fbd954f2b0d8cd5cf11c885fed4805225749f',
          src: '//my-cdn.com/files/',
          type: 'jade'
        });
        expect(callBack.args[0][0].response.renderMode).to.equal('unrendered');
        expect(fireStub.args[0][1].renderMode).to.equal('unrendered');
      });
    });
  });

  describe('when rendering a component with a non legacy template', () => {
    describe('when the registry supports the template', () => {
      describe("when oc-client requests an unrendered component and the client doesn't support it", () => {
        const headers = {
          'user-agent': 'oc-client-0/0-0-0',
          templates: 'oc-template-jade,6.0.1;oc-template-handlebars,6.0.2',
          accept: 'application/vnd.oc.unrendered+json'
        };
        let callBack;

        before(done => {
          initialise(mockedComponents['async-error3-component']);
          const getComponent = GetComponent({}, mockedRepository);
          callBack = sinon.spy(() => done());
          getComponent(
            {
              name: 'async-error3-component',
              headers,
              parameters: {},
              version: '1.X.X',
              conf: { baseUrl: 'http://components.com/' }
            },
            callBack
          );
        });

        it('should return the rendered version', () => {
          expect(callBack.args[0][0].response.template).to.equal(undefined);
          expect(callBack.args[0][0].response.html).to.equal(
            '<div>hello</div>'
          );
          expect(callBack.args[0][0].response.renderMode).to.equal('rendered');
          expect(fireStub.args[0][1].renderMode).to.equal('rendered');
        });
      });

      describe('when oc-client requests an unrendered component and the client supports the correct template', () => {
        const headers = {
          'user-agent': 'oc-client-0/0-0-0',
          templates:
            'oc-template-jade,6.0.1;oc-template-handlebars,6.0.2;oc-template-supported,1.2.3',
          accept: 'application/vnd.oc.unrendered+json'
        };
        let callBack;

        before(done => {
          initialise(mockedComponents['async-error3-component']);
          const getComponent = GetComponent({}, mockedRepository);
          callBack = sinon.spy(() => done());
          getComponent(
            {
              name: 'async-error3-component',
              headers,
              parameters: {},
              version: '1.X.X',
              conf: { baseUrl: 'http://components.com/' }
            },
            callBack
          );
        });

        it('should return the unrendered version', () => {
          expect(callBack.args[0][0].response.html).to.equal(undefined);
          expect(callBack.args[0][0].response.template).to.deep.equal({
            key: '8c1fbd954f2b0d8cd5cf11c885fed4805225749f',
            src: '//my-cdn.com/files/',
            type: 'oc-template-supported'
          });
          expect(callBack.args[0][0].response.renderMode).to.equal(
            'unrendered'
          );
          expect(fireStub.args[0][1].renderMode).to.equal('unrendered');
        });
      });
    });

    describe("when the registry doesn't support the template", () => {
      describe("when oc-client requests an unrendered component and the client doesn't support it", () => {
        const headers = {
          'user-agent': 'oc-client-0/0-0-0',
          templates: 'oc-template-jade,6.0.1;oc-template-handlebars,6.0.2',
          accept: 'application/vnd.oc.unrendered+json'
        };
        let callBack;

        before(done => {
          initialise(mockedComponents['async-error4-component']);
          const getComponent = GetComponent({}, mockedRepository);
          callBack = sinon.spy(() => done());
          getComponent(
            {
              name: 'async-error4-component',
              headers,
              parameters: {},
              version: '1.X.X',
              conf: { baseUrl: 'http://components.com/' }
            },
            callBack
          );
        });

        it('should return an error', () => {
          expect(callBack.args[0][0].status).to.equal(400);
          expect(callBack.args[0][0].response.code).to.equal(
            'TEMPLATE_NOT_SUPPORTED'
          );
          expect(callBack.args[0][0].response.error).to.equal(
            'oc-template-notsupported is not a supported oc-template'
          );
        });
      });

      describe('when oc-client requests an unrendered component and the client supports the correct template', () => {
        const headers = {
          'user-agent': 'oc-client-0/0-0-0',
          templates:
            'oc-template-jade,6.0.1;oc-template-handlebars,6.0.2;oc-template-unsupported,1.2.3',
          accept: 'application/vnd.oc.unrendered+json'
        };
        let callBack;

        before(done => {
          initialise(mockedComponents['async-error4-component']);
          const getComponent = GetComponent({}, mockedRepository);
          callBack = sinon.spy(() => done());
          getComponent(
            {
              name: 'async-error4-component',
              headers,
              parameters: {},
              version: '1.X.X',
              conf: { baseUrl: 'http://components.com/' }
            },
            callBack
          );
        });

        it('should return an error', () => {
          expect(callBack.args[0][0].status).to.equal(400);
          expect(callBack.args[0][0].response.code).to.equal(
            'TEMPLATE_NOT_SUPPORTED'
          );
          expect(callBack.args[0][0].response.error).to.equal(
            'oc-template-notsupported is not a supported oc-template'
          );
        });
      });
    });
  });
});
