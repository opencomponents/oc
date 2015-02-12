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
        }
      }
    },

    info: { help: 'Shows installed components on the current project' },

    init: {
      help: 'Creates a new empty component in the current folder',
      options: {
        componentName: {
          help: 'The name of the component to create'
        },
        templateType: {
          help: 'The type of the template of the component'
        }
      }
    },

    link: {
      help: 'Links a component in the current project',
      options: {
        componentName: {
          help: 'The name of the component to link. <oc ls> to see the list of available components'
        },
        componentVersion: {
          help: 'The specific version of the component to link. Default is the latest',
          required: false
        }
      }
    },

    ls: { help: 'Shows the list of the available components for a linked oc registry' },

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

    unlink: {
      help: 'Unlinks a component from the current project',
      options: {
        componentName: {
          help: 'The name of the component to unlink. <oc info> to see the list of linked components'
        }
      }
    },

    version: {
      help: 'Shows the cli version',
      flag: true
    }
  }
};