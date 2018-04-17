'use strict';

const expect = require('chai').expect;
const injectr = require('injectr');
const sinon = require('sinon');

describe('registry : domain : register-templates', () => {
  const registerTemplates = require('../../src/registry/domain/register-templates.js');

  describe('when templates get registered without additional templates', () => {
    const registerd = registerTemplates();

    it('should correctly register core-templates', () => {
      expect(registerd.templatesHash).to.deep.eql({
        'oc-template-es6': require('oc-template-es6'),
        'oc-template-jade': require('oc-template-jade'),
        'oc-template-handlebars': require('oc-template-handlebars')
      });
      expect(registerd.templatesInfo).to.deep.eql([
        require('oc-template-es6').getInfo(),
        require('oc-template-jade').getInfo(),
        require('oc-template-handlebars').getInfo()
      ]);
    });
  });

  describe('when templates get registered with additional templates', () => {
    const templateMock = {
      getInfo() {
        return {
          type: 'new-tpl',
          version: '6.6.6',
          externals: {}
        };
      }
    };

    const registerd = registerTemplates([templateMock]);

    it('should correctly register core-templates & extra templates', () => {
      expect(registerd.templatesHash).to.deep.eql({
        'oc-template-es6': require('oc-template-es6'),
        'oc-template-jade': require('oc-template-jade'),
        'oc-template-handlebars': require('oc-template-handlebars'),
        'new-tpl': templateMock
      });
      expect(registerd.templatesInfo).to.deep.eql([
        require('oc-template-es6').getInfo(),
        require('oc-template-jade').getInfo(),
        require('oc-template-handlebars').getInfo(),
        templateMock.getInfo()
      ]);
    });

    describe('and additional template is already part of core-templates', () => {
      const registered = registerTemplates([require('oc-template-jade')]);

      it('should correctly register core-templates only', () => {
        expect(registered.templatesHash).to.deep.eql({
          'oc-template-es6': require('oc-template-es6'),
          'oc-template-jade': require('oc-template-jade'),
          'oc-template-handlebars': require('oc-template-handlebars')
        });
        expect(registered.templatesInfo).to.deep.eql([
          require('oc-template-es6').getInfo(),
          require('oc-template-jade').getInfo(),
          require('oc-template-handlebars').getInfo()
        ]);
      });
    });
  });
});
