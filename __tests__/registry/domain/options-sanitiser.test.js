const optionsSanitiser = require('../../../src/registry/domain/options-sanitiser');

jest.mock('../../../src/registry/domain/authentication', () => ({
  middleware: jest.fn(() => 'auth middleware has been assigned')
}));

describe('options sanitiser', () => {
  const scenarios = [
    {
      description: 'empty baseUrl to equal "/"',
      input: { baseUrl: '' },
      options: {
        key: 'baseUrl',
        value: '/'
      }
    },
    {
      description: 'verbosity 3 to equal 3',
      input: {
        baseUrl: '',
        verbosity: 3
      },
      options: {
        key: 'verbosity',
        value: 3
      }
    },
    {
      description:
        'customHeadersToSkipOnWeakVersion to equal customHeadersToSkipOnWeakVersion.toLowerCase()',
      input: {
        baseUrl: '',
        customHeadersToSkipOnWeakVersion: ['aaa', 'BBB', 'CCC-ccc']
      },
      options: {
        key: 'customHeadersToSkipOnWeakVersion',
        value: ['aaa', 'bbb', 'ccc-ccc']
      }
    },
    {
      description: 'fallbackRegistryUrl to equal fallbackRegistryUrl + "/"',
      input: {
        baseUrl: '',
        fallbackRegistryUrl: 'http://test-url.com'
      },
      options: {
        key: 'fallbackRegistryUrl',
        value: 'http://test-url.com/'
      }
    },
    {
      description: 'empty prefix to equal "/"',
      input: {
        baseUrl: ''
      },
      options: {
        key: 'prefix',
        value: '/'
      }
    },
    {
      description: 'prefix "/-/" to equal "/-/"',
      input: {
        baseUrl: '',
        prefix: '/-/'
      },
      options: {
        key: 'prefix',
        value: '/-/'
      }
    },
    {
      description: 'empty baseUrl and prefix "/-/" to equal baseUrl "/-/"',
      input: {
        baseUrl: '',
        prefix: '/-/'
      },
      options: {
        key: 'baseUrl',
        value: '/-/'
      }
    },
    {
      description: 'baseUrl "/" and prefix "/-/" to equal baseUrl "/-/"',
      input: {
        baseUrl: '/',
        prefix: '/-/'
      },
      options: {
        key: 'baseUrl',
        value: '/-/'
      }
    },
    {
      description:
        'publishAuth {} to equal beforePublish "auth middleware has been assigned"',
      input: {
        baseUrl: '',
        publishAuth: {}
      },
      options: {
        key: 'beforePublish',
        value: 'auth middleware has been assigned'
      }
    }
  ];

  scenarios.forEach(({ description, input, options }) => {
    test(description, () => {
      const output = optionsSanitiser(input);
      expect(output[options.key]).toEqual(options.value);
      expect(output).toMatchSnapshot();
    });
  });
});
