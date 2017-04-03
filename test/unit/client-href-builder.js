'use strict';

var expect = require('chai').expect;
var hrefBuilderPrototype = require('../../client/src/href-builder');

describe('client : href-builder :', () => {

  describe('server method - ', () => {
    describe('when the server rendering endpoint is set in both the options and in the configuration', () => {
      it('should get the result from the options', () => {
        let hrefBuilder = new hrefBuilderPrototype({registries: {serverRendering: 'from configuration'}});
        expect(hrefBuilder.server({registries: {serverRendering: 'from options'}})).to.equal('from options');
      });
    });

    describe('when the server rendering endpoint is not set in the options param', () => {
      it('it should get the result from the configuration', () => {
        let hrefBuilder = new hrefBuilderPrototype({registries: {serverRendering: 'from configuration'}});
        expect(hrefBuilder.server({})).to.equal('from configuration');
      });
    });
  });

  describe('prepareServerGet method - ', () => {
    describe('when only the component name is set', () => {
      it('it should return a valid request for the component', () => {
        let hrefBuilder = new hrefBuilderPrototype({});
        expect(hrefBuilder.prepareServerGet('http://localhost:3030', {name: 'hello-world'}, {}))
            .to.equal('http://localhost:3030/hello-world');
      });
    });

    describe('when the component name and version are set', () => {
      it('it should return a valid request for the component', () => {
        let hrefBuilder = new hrefBuilderPrototype({});
        expect(hrefBuilder.prepareServerGet('http://localhost:3030', {name: 'hello-world', version: '1.0.0'}, {}))
            .to.equal('http://localhost:3030/hello-world/1.0.0');
      });
    });

    describe('when there is one component parameter set in the options', () => {
      it('it should return a valid request for the component with the parameter set as URL query param', () => {
        let component = { name: 'hello-world', version: '1.0.0', parameters: { p1: 'v1' } };
        let hrefBuilder = new hrefBuilderPrototype({});
        
        expect(hrefBuilder.prepareServerGet('http://localhost:3030', component))
            .to.equal('http://localhost:3030/hello-world/1.0.0/?p1=v1');
      });
    });

    describe('when there are more than one component parameters set in the options', () => {
      it('it should return a valid request for the component with the parameters set as URL query params', () => {
        let component = { name: 'hello-world', version: '1.0.0', parameters: { p1: 'v1', p2: 'v 2' } };
        let hrefBuilder = new hrefBuilderPrototype({});
        
        expect(hrefBuilder.prepareServerGet('http://localhost:3030', component))
            .to.equal('http://localhost:3030/hello-world/1.0.0/?p1=v1&p2=v%202');
      });
    });

    describe('when there are parameters in both "options" and "component"', () => {
      it('it should return a valid request for the component with the parameters set as URL query params', () => {
        let options = { parameters: { p1: 'v1', p2: 'v 2' } };
        let component = { name: 'hello-world', version: '1.0.0', parameters: { message: 'hello' } };
        let hrefBuilder = new hrefBuilderPrototype({});

        expect(hrefBuilder.prepareServerGet('http://localhost:3030', component, options))
          .to.equal('http://localhost:3030/hello-world/1.0.0/?message=hello&p1=v1&p2=v%202');
      });
    });
  });
});
