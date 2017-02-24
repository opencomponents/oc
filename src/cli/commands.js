/* jshint maxlen: false */
'use strict';

module.exports = {
  oc: {

    dev: {
      cmd: 'dev <dirName>',   //should be dirPath imho
      help: 'Runs a local oc test registry in order to develop and test components',
      options: {
        port: {
          describe: 'The port where to start a local oc instance',
          default: 3000
        },
        baseUrl:{
          describe: 'The base url the component is hosted from', default: 'http://localhost:port/'
        },
        fallbackRegistryUrl: {
          describe: 'Url to another registry which will be used by dev registry when component cannot be found in local registry. Example: --fallbackRegistryUrl=http://anotherhost:anotherport/',
        }
      }
    },

    init: {
      cmd: 'init <componentName>',
      help: 'Creates a new empty component in the current folder',
      options: {
        templateType: {
          describe: 'The component\'s template type. Options are jade or handlebars',
          default: 'handlebars'
        }
      }
    },

    mock: {
      cmd: 'mock <targetType> <targetName> <targetValue>',
      help: 'Allows to mock configuration in order to facilitate local development'
    },

    preview: {
      cmd: 'preview <componentHref>',
      example: {
        cmd: '$0 preview "http://localhost:3000/my-new-component/1.0.0/?param1=hello&name=Arthur"'
      },
      help: 'Runs a test page consuming a component'
    },

    publish: {
      cmd: 'publish <componentPath>',
      example: {
        cmd: '$0 publish my-new-component/'
      },
      help: 'Publish a component'
    },

    registry: {
      cmd: 'registry <command>',
      help: 'Manages oc registries in the current project',
      commands: {
        add: {
          cmd: 'add <registryUrl>',
          example: {
            cmd: '$0 registry add http://my-registry.in.my.domain/'
          },
          help: 'Adds oc registries to the current project'
        },
        ls: {
          example: {
            cmd: '$0 registry ls'
          },
          help: 'Shows oc registries added to the current project'
        },
        remove: {
          cmd: 'remove <registryUrl>',
          example: {
            cmd: '$0 registry remove http://my-registry.in.my.domain/'
          },
          help: 'Removes oc registries from the current project'
        }
      }
    },

    version: {
      help: 'Shows the cli version'
    }
  }
};
