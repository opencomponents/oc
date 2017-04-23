const expect = require('chai').expect;
const { getParams, getParams__, getParamsV2 } = require('../../src/registry/routes/helpers/get-params.js');

const scenarios = [
  {
    description: 'oc-apod',
    parameters: {
      apiKey:
      {
        type: 'string',
        mandatory: true,
        example: 'DEMO_KEY',
        description: 'The NASA Open APIs key'
      }
    }
  },
  {
    description: 'oc-columbus-header',
    parameters: {
      title:
      {
        type: 'string',
        mandatory: true,
        example: 'Instagram',
        description: 'The main title'
      },
      logoUrl:
      {
        type: 'string',
        mandatory: true,
        example: 'http://www.uidownload.com/files/722/15/621/facebook-instagram-instagram-2016-instagram-logo-new-new-instagram-icon.png',
        description: 'The logo\'s absolute url'
      }
    }
  }
];

scenarios.forEach((scenario) => {
  describe(scenario.description, () => {
    it('getParams__ should match getParamsV2', () => {
      const component = {
        oc: {
          parameters: scenario.parameters
        }
      };

      expect(getParams__(component)).to.deep.equal(getParamsV2(component));
    });
  });
});

scenarios.forEach((scenario) => {
  describe(scenario.description, () => {
    it('getParams should match getParamsV2', () => {
      const component = {
        oc: {
          parameters: scenario.parameters
        }
      };

      expect(getParams(component)).to.deep.equal(getParamsV2(component));
    });
  });
});
