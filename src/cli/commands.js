/* jshint maxlen: false */
'use strict';

module.exports = {
  oc: {

    dev: {
      help: 'Runs a local oc test registry in order to develop and test components',
      options: {
        dirName: {
          help: 'The name of the directory to watch, where the components are stored'
        },
        port: {
          help: 'The port where to start a local oc instance. Default 3000',
          required: false
        },
        baseUrl:{
          help: 'The base url the component is hosted from. Default http://localhost:port/',
          required: false
        },
        fallbackRegistryUrl: {
          help: 'Url to another registry which will be used by dev registry when component cannot be found in local registry. Example: --fallbackRegistryUrl=http://anotherhost:anotherport/',
          required: false
        }
      }
    },

    init: {
      help: 'Creates a new empty component in the current folder',
      options: {
        componentName: {
          help: 'The name of the component to create'
        },
        templateType: {
          help: 'The component\'s template type. Options are jade or handlebars (default).',
          required: false,
          default: 'handlebars'
        }
      }
    },

    mock: {
      help: 'Allows to mock configuration in order to facilitate local development',
      options: {
        targetType: {
          help: 'The type of item to mock',
          choices: ['plugin']
        },
        targetName: {
          help: 'The item to mock'
        },
        targetValue: {
          help: 'The mocked value (static plugin) or the file to read (dynamic plugin)'
        }
      }
    },

    preview: {
      help: 'Runs a test page consuming a component',
      options: {
        componentHref: {
          help: 'The name of the component to preview'
        }
      }
    },

    publish: {
      help: 'Publish a component',
      options: {
        componentPath: { help: 'The path of the component to publish' }
      }
    },

    registry: {
      help: 'Shows, adds, removes oc registries to the current project',
      options: {
        command: {
          help: 'Action: add, ls, or remove',
          choices: ['add', 'ls', 'remove']
        },
        parameter: {
          help: 'Parameter to perform the action',
          required: false
        }
      }
    },

    version: {
      help: 'Shows the cli version',
      flag: true
    }
  }
};
