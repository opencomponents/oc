/* jshint maxlen: false */
'use strict';

module.exports = {
  usage: 'Usage: $0 <command> [options]',
  commands: {
    dev: {
      cmd: 'dev <dirPath> [port] [baseUrl]',
      example: {
        cmd:
          '$0 dev ../all-components 3001 127.0.0.1:3001 --fallbackRegistryUrl=http://anotherhost:anotherport/'
      },
      description:
        'Runs a local oc test registry in order to develop and test components',
      options: {
        fallbackRegistryUrl: {
          description:
            'Url to another registry which will be used by dev registry when component cannot be found in local registry'
        },
        hotReloading: {
          boolean: true,
          description:
            'Enables hot reloading. Note: when hot reloading is set to true, each request to the component will make the registry to create a new instance for the javascript closures to be loaded, while when false the instance will be recycled between components executions',
          default: true
        },
        verbose: {
          boolean: true,
          description: 'Verbosity',
          default: false
        },
        watch: {
          boolean: true,
          description: 'Watch for file changes',
          default: true
        },
        production: {
          boolean: true,
          description: 'Force packaging for production',
          default: false
        },
        prefix: {
          boolean: false,
          description: 'Url prefix for registry server',
          default: ''
        }
      },
      usage: 'Usage: $0 dev <dirName> [port] [baseUrl] [options]'
    },

    init: {
      cmd: 'init <componentName> [templateType]',
      example: {
        cmd: '$0 init test-component jade'
      },
      description:
        'Creates a new empty component of a specific template type in the current folder [templateType default: oc-template-handlebars]',
      usage: 'Usage: $0 init <componentName> [templateType]'
    },

    mock: {
      cmd: 'mock <targetType> <targetName> <targetValue>',
      example: {
        cmd: '$0 mock plugin hash "always-returned-value"',
        description:
          'Creates static mock for a "hash" plugin which always returns "always-returned-value" value'
      },
      description:
        'Allows to mock configuration in order to facilitate local development',
      usage: 'Usage: $0 mock <targetType> <targetName> <targetValue>'
    },

    preview: {
      cmd: 'preview <componentHref>',
      example: {
        cmd:
          '$0 preview "http://localhost:3000/my-new-component/1.0.0/?param1=hello&name=Arthur"'
      },
      description: 'Runs a test page consuming a component',
      usage: 'Usage: $0 preview <componentHref>'
    },

    package: {
      cmd: 'package <componentPath>',
      example: {
        cmd: '$0 package my-new-component/'
      },
      options: {
        compress: {
          boolean: true,
          description: 'Create zipped file',
          default: false
        }
      },
      description: 'Creates the packaged component ready to be published',
      usage: 'Usage: $0 package <componentPath>'
    },

    publish: {
      cmd: 'publish <componentPath>',
      example: {
        cmd: '$0 publish my-new-component/'
      },
      options: {
        password: {
          description:
            'password used to authenticate when publishing to registry'
        },
        username: {
          description:
            'username used to authenticate when publishing to registry'
        }
      },
      description: 'Publish a component',
      usage: 'Usage: $0 publish <componentPath>'
    },

    registry: {
      cmd: 'registry <command>',
      description: 'Manages oc registries in the current project',
      commands: {
        add: {
          cmd: 'add <registryUrl>',
          example: {
            cmd: '$0 registry add http://my-registry.in.my.domain/'
          },
          description: 'Adds oc registries to the current project',
          usage: 'Usage: $0 registry add <registryUrl>'
        },
        ls: {
          example: {
            cmd: '$0 registry ls'
          },
          description: 'Shows oc registries added to the current project',
          usage: 'Usage: $0 registry ls'
        },
        remove: {
          cmd: 'remove <registryUrl>',
          example: {
            cmd: '$0 registry remove http://my-registry.in.my.domain/'
          },
          description: 'Removes oc registries from the current project',
          usage: 'Usage: $0 registry remove <registryUrl>'
        }
      },
      usage: 'Usage: $0 registry <command>'
    }
  }
};
