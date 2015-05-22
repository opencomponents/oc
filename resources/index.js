'use strict';

module.exports = {
  commands: {
    cli: {
      MOCK_PLUGIN: 'oc mock plugin <pluginName> "some value"'
    }
  },
  errors: {
    registry: {
      COMPONENT_NAME_NOT_VALID: 'The component\'s name contains invalid characters. Allowed are alphanumeric, _, -',
      COMPONENT_NAME_NOT_VALID_CODE: 'name_not_valid',
      COMPONENT_NOT_FOUND: 'Component "{0}" not found on {1}',
      COMPONENT_VERSION_NOT_FOUND: 'Component "{0}" with version "{1}" not found on {2}',
      COMPONENT_VERSION_ALREADY_FOUND: 'Component "{0}" with version "{1}" can\'t be published to {2} because a component with the same name and version already exists',
      COMPONENT_VERSION_ALREADY_FOUND_CODE: 'already_exists',
      COMPONENT_VERSION_NOT_VALID: 'Version "{0}" is not a valid semantic version.',
      COMPONENT_VERSION_NOT_VALID_CODE: 'version_not_valid',
       
      CONFIGURATION_DEPENDENCIES_MUST_BE_ARRAY: 'Registry configuration is not valid: dependencies must be an array',
      CONFIGURATION_A_DEPENDENCY_NOT_FOUND: 'Registry configuration is not valid: a dependency is not valid.',
      CONFIGURATION_EMPTY: 'Registry configuration is empty',
      CONFIGURATION_ONREQUEST_MUST_BE_FUNCTION: 'Registry configuration is not valid: registry.on\'s callback must be a function',
      CONFIGURATION_PUBLISH_AUTH_CREDENTIALS_MISSING: 'Registry configuration is not valid: basic auth requires username and password',
      CONFIGURATION_PUBLISH_AUTH_NOT_SUPPORTED: 'Registry configuration is not valid: auth not supported',
      CONFIGURATION_PREFIX_DOES_NOT_END_WITH_SLASH: 'Registry configuration is not valid: prefix should end with "/"',
      CONFIGURATION_PREFIX_DOES_NOT_START_WITH_SLASH: 'Registry configuration is not valid: prefix should start with "/"',
      CONFIGURATION_ROUTES_HANDLER_MUST_BE_FUNCTION: 'Registry configuration is not valid: handler should be a function',
      CONFIGURATION_ROUTES_NOT_VALID: 'Registry configuration is not valid: each route should contain route, method and handler',
      CONFIGURATION_ROUTES_MUST_BE_ARRAY: 'Registry configuration is not valid: routes must be an array',
      DEPENDENCY_NOT_FOUND: 'Component is trying to use unavailable dependencies: {0}',
      DEPENDENCY_NOT_FOUND_CODE: 'DEPENDENCY_MISSING_FROM_REGISTRY',
      LOCAL_PUBLISH_NOT_ALLOWED: 'Components can\'t be published to local repository',
      LOCAL_PUBLISH_NOT_ALLOWED_CODE: 'not_allowed',

      GENERIC_ERROR: 'error!',
      GENERIC_NOT_FOUND: 'not found!',

      MANDATORY_PARAMETER_MISSING: 'Expected mandatory parameters are missing: {0}',
      MANDATORY_PARAMETER_MISSING_CODE: 'missing',

      PARAMETER_WRONG_FORMAT: 'Parameters are not correctly formatted: {0}',
      PARAMETER_WRONG_FORMAT_CODE: 'wrong type',
      PLUGIN_NOT_FOUND: 'Component is trying to use un-registered plugins: {0}',
      PLUGIN_NOT_VALID: 'Plugin {0} is not valid'
    },
    cli: {
      COMPONENT_HREF_NOT_FOUND: 'The specified path is not a valid component\'s url',
      COMPONENTS_LINKED_NOT_FOUND: 'No components linked in the project',
      COMPONENTS_NOT_FOUND: 'no components found in specified path',
      DEV_FAIL: 'An error happened when initialising the dev runner: {0}',
      INIT_FAIL: 'An error happened when initialising the component: {0}',
      INVALID_CREDENTIALS: 'Invalid credentials',
      NAME_NOT_VALID: 'the name is not valid. Allowed characters are alphanumeric, _, -',
      PACKAGE_CREATION_FAIL: 'An error happened when creating the package: {0}',
      PACKAGING_FAIL: 'an error happened while packaging {0}: {1}',
      PLUGIN_MISSING_FROM_REGISTRY: 'Looks like you are trying to use a plugin in the dev mode ({0}).\nYou need to mock it doing {1}',
      PLUGIN_MISSING_FROM_COMPONENT: 'Looks like you are trying to use a plugin you haven\'t registered ({0}).' +
        '\nYou need to register it editing your component\'s package.json',
      PORT_IS_BUSY: 'The port {0} is already in use. Specify the optional port parameter to use another port.',
      PUBLISHING_FAIL: 'An error happened when publishing the component: {0}',
      REGISTRY_NOT_FOUND: 'oc registries not found. Run "oc registry add <registry href>"',
      TEMPLATE_TYPE_NOT_VALID: 'the template is not valid. Allowed values are handlebars and jade'
    },
    generic: 'An error occurred: {0}',
    s3: {
      DIR_NOT_FOUND: 'Directory "{0}" not found',
      DIR_NOT_FOUND_CODE: 'dir_not_found',

      FILE_NOT_FOUND: 'File "{0}" not found',
      FILE_NOT_FOUND_CODE: 'file_not_found'
    }
  },
  messages: {
    cli: {
      CHANGES_DETECTED: 'Changes detected on file: {0}',
      CHECKING_DEPENDENCIES: 'Ensuring dependencies are loaded...',
      COMPONENT_INITED: 'Component "{0}" created',
      COMPONENT_LINKED: 'oc Component linked',
      COMPONENT_UNLINKED: 'oc Component unlinked',
      COMPONENTS_LINKED_LIST: 'Components linked in project:',
      COMPONENTS_LIST: 'Components available in oc registry: {0}',
      COMPRESSING: 'Compressing -> {0}',
      ENTER_PASSWORD: 'Enter password:',
      ENTER_USERNAME: 'Enter username:',
      HELP_HINT: 'Hint: Run -h with any command to show the help',
      INSTALLING_DEPS: 'Trying to install missing modules: {0}\nIf you aren\'t connected to the internet, or npm isn\'t configured then this step will fail',
      MOCKED_PLUGIN: 'Mock for plugin has been registered: {0} () => {1}',
      PACKAGING: 'Packaging -> {0}',
      PACKAGING_COMPONENTS: 'Packaging components...',
      PREVIEW_STARTED_AT_URL: 'Component\'s preview started at url: {0}',
      PUBLISHED: 'Published -> {0}',
      PUBLISHING: 'Publishing -> {0}',
      REGISTERING_MOCKED_PLUGINS: 'Registering mocked plugins...',
      REGISTRY_ADDED: 'oc registry added',
      REGISTRY_CREDENTIALS_REQUIRED: 'Registry requires credentials.',
      REGISTRY_LIST: 'oc linked registries:',
      REGISTRY_REMOVED: 'oc registry deleted',
      REGISTRY_STARTING: 'Starting dev registry on http://localhost:{0}...',
      RETRYING_10_SECONDS: 'Retrying in 10 seconds...',
      SCANNING_COMPONENTS: 'Looking for components...'
    },
    registry: {
      RESOLVING_DEPENDENCIES: 'Resolving dependencies...'
    }
  }
};