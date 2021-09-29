import { green, yellow } from 'colors/safe';

// Kind of long multi-string messages and functions

const validFunctionMock = `// simplified mock signature
module.exports = (a, b) => a+b;`;

const validMockObject = `// standard plugin-like signature

const dbClient = require('my-db-client');
let cache;

module.exports.register = (options, dependencies, next) => {
  let client = dbClient(options);
  client.init((err, response) => {
    cache = response;
    next(err);
  });
};

module.exports.execute = key => cache[key];
`;

const mockPluginIsNotValid = `Looks like you are trying to register a dynamic mock plugin but the file you specified is not a valid mock.
The entry point should be a synchronous function or an object containing an asynchronous register() function and a synchronous execute() function.
Example:

${yellow(validFunctionMock)}

${yellow(validMockObject)}`;

const initSuccess = (componentName, componentPath) => {
  const success = `Success! Created ${componentName} at ${componentPath}`;
  return `${green(success)}

From here you can run several commands

${green('oc --help')}
To see a detailed list of all the commands available

We suggest that you begin by typing:

${green('oc dev . 3030')}

If you have questions, issues or feedback about OpenComponents, please, join us on Gitter:
${green('https://gitter.im/opentable/oc')}

Happy coding

`;
};

// Kind of concise string messages and functions

export default {
  commands: {
    cli: {
      MOCK_PLUGIN: 'oc mock plugin <pluginName> "some value"',
      UPGRADE: version => `[sudo] npm i -g oc@${version}`
    }
  },
  errors: {
    registry: {
      BATCH_ROUTE_BODY_NOT_VALID: message =>
        `The request body is malformed: ${message}`,
      BATCH_ROUTE_BODY_NOT_VALID_CODE: 'POST_BODY_NOT_VALID',
      BATCH_ROUTE_COMPONENTS_PROPERTY_MISSING: 'components property is missing',
      BATCH_ROUTE_COMPONENTS_NOT_ARRAY: 'components property is not an array',
      BATCH_ROUTE_COMPONENT_NAME_MISSING: idx =>
        `component ${idx} must have name property`,
      COMPONENT_EXECUTION_ERROR: msg => `Component execution error: ${msg}`,
      COMPONENT_NAME_NOT_VALID:
        "The component's name contains invalid characters. Allowed are alphanumeric, _, -",
      COMPONENT_NAME_NOT_VALID_CODE: 'name_not_valid',
      COMPONENT_NOT_FOUND: (name, source) =>
        `Component "${name}" not found on ${source}`,
      COMPONENT_PUBLISHNAME_CONFLICT:
        'Component name conflict. Ensure package.json and components folder name are equal.',
      COMPONENT_PUBLISHVALIDATION_FAIL: error =>
        `Component validation failed: ${error}`,
      COMPONENT_PUBLISHVALIDATION_FAIL_CODE: 'not_allowed',
      COMPONENT_VERSION_NOT_FOUND: (name, version, source) =>
        `Component "${name}" with version "${version}" not found on ${source}`,
      COMPONENT_VERSION_ALREADY_FOUND: (name, version, source) =>
        `Component "${name}" with version "${version}" can\'t be published to ${source} because a component with the same name and version already exists`,
      COMPONENT_VERSION_ALREADY_FOUND_CODE: 'already_exists',
      COMPONENT_VERSION_NOT_VALID: version =>
        `Version "${version}" is not a valid semantic version.`,
      COMPONENT_VERSION_NOT_VALID_CODE: 'version_not_valid',
      COMPONENT_SET_HEADER_PARAMETERS_NOT_VALID:
        'context.setHeader parameters must be strings',
      CONFIGURATION_DEPENDENCIES_MUST_BE_ARRAY:
        'Registry configuration is not valid: dependencies must be an array',
      CONFIGURATION_EMPTY: 'Registry configuration is empty',
      CONFIGURATION_ONREQUEST_MUST_BE_FUNCTION:
        "Registry configuration is not valid: registry.on's callback must be a function",
      CONFIGURATION_OFFREQUEST_MUST_BE_FUNCTION:
        "Registry configuration is not valid: registry.off's callback must be a function",
      CONFIGURATION_PUBLISH_BASIC_AUTH_CREDENTIALS_MISSING:
        'Registry configuration is not valid: basic auth requires username and password',
      CONFIGURATION_PUBLISH_AUTH_MODULE_NOT_FOUND: moduleName =>
        `Registry configuration is not valid: module "${moduleName}" not found`,
      CONFIGURATION_PREFIX_DOES_NOT_END_WITH_SLASH:
        'Registry configuration is not valid: prefix should end with "/"',
      CONFIGURATION_PREFIX_DOES_NOT_START_WITH_SLASH:
        'Registry configuration is not valid: prefix should start with "/"',
      CONFIGURATION_ROUTES_HANDLER_MUST_BE_FUNCTION:
        'Registry configuration is not valid: handler should be a function',
      CONFIGURATION_ROUTES_NOT_VALID:
        'Registry configuration is not valid: each route should contain route, method and handler',
      CONFIGURATION_ROUTES_MUST_BE_ARRAY:
        'Registry configuration is not valid: routes must be an array',
      CONFIGURATION_ROUTES_ROUTE_CONTAINS_PREFIX: prefix =>
        `Registry configuration is not valid: route url can\'t contain "${prefix}"`,
      CONFIGURATION_STORAGE_NOT_VALID: storage =>
        `Registry configuration is not valid: ${storage} configuration is not valid`,
      CONFIGURATION_HEADERS_TO_SKIP_MUST_BE_STRING_ARRAY:
        'Registry configuration is not valid: customHeadersToSkipOnWeakVersion must be an array of strings',
      DATA_OBJECT_IS_UNDEFINED: 'data object is undefined',
      DEPENDENCY_NOT_FOUND: dependencies =>
        `Component is trying to use unavailable dependencies: ${dependencies}`,
      DEPENDENCY_NOT_FOUND_CODE: 'DEPENDENCY_MISSING_FROM_REGISTRY',
      LOCAL_PUBLISH_NOT_ALLOWED:
        "Components can't be published to local repository",
      LOCAL_PUBLISH_NOT_ALLOWED_CODE: 'not_allowed',
      GENERIC_ERROR: 'error!',
      MANDATORY_PARAMETER_MISSING: parameter =>
        `Expected mandatory parameters are missing: ${parameter}`,
      MANDATORY_PARAMETER_MISSING_CODE: 'missing',
      NESTED_RENDERER_CALLBACK_IS_NOT_VALID: 'callback is not valid',
      NESTED_RENDERER_COMPONENT_NAME_IS_NOT_VALID:
        "component's name is not valid",
      NESTED_RENDERER_COMPONENTS_IS_NOT_VALID: 'components is not valid',
      NODE_CLI_VERSION_IS_NOT_VALID: (registry, cli) =>
        `Node CLI version is not valid: Registry ${registry}, CLI ${cli}`,
      OC_CLI_VERSION_IS_NOT_VALID: (registry, cli) =>
        `OC CLI version is not valid: Registry ${registry}, CLI ${cli}`,
      PARAMETER_WRONG_FORMAT: parameters =>
        `Parameters are not correctly formatted: ${parameters}`,
      PARAMETER_WRONG_FORMAT_CODE: 'wrong type',
      PLUGIN_NOT_IMPLEMENTED: plugins =>
        `registry does not implement plugins: ${plugins}`,
      PLUGIN_NOT_VALID: plugin => `Plugin ${plugin} is not valid`,
      RESOLVING_ERROR: 'component resolving error',
      TEMPLATE_NOT_FOUND: template => `Template ${template} not found`,
      TEMPLATE_NOT_SUPPORTED: templateType =>
        `${templateType} is not a supported oc-template`,
      RENDER_ERROR: (component, error) =>
        `Render Error for ${component}: ${error}`
    },
    cli: {
      cleanRemoveError: err =>
        `An error happened when removing the folders: ${err}`,
      scaffoldError: (url, error) =>
        `Scaffolding failed. Please open an issue on ${url} with the following information: ${error}`,
      COMPONENT_HREF_NOT_FOUND:
        "The specified path is not a valid component's url",
      COMPONENTS_NOT_FOUND: 'no components found in specified path',
      DEPENDENCIES_INSTALL_FAIL:
        'An error happened when installing the dependencies',
      DEPENDENCY_LINK_FAIL: (dependency, error) =>
        `An error happened when linking the dependency ${dependency} with error ${error}`,
      DEPENDENCIES_LINK_FAIL: 'An error happened when linking the dependencies',
      DEV_FAIL: error =>
        `An error happened when initialising the dev runner: ${error}`,
      INIT_FAIL: error =>
        `An error happened when initialising the component: ${error}`,
      INVALID_CREDENTIALS: 'Invalid credentials',
      MOCK_PLUGIN_IS_NOT_VALID: mockPluginIsNotValid,
      NAME_NOT_VALID:
        'the name is not valid. Allowed characters are alphanumeric, _, -',
      NODE_CLI_VERSION_NEEDS_UPGRADE: version =>
        `the version of used node is invalid. Try to upgrade node to version matching '${version}'`,
      NODE_CLI_VERSION_UNSUPPORTED: (nodeVersion, minVersion) =>
        `ALERT: You're currently running OC on an unsupported Node version (${nodeVersion}).\nPlease upgrade Node to >= ${minVersion}.`,
      OC_CLI_VERSION_NEEDS_UPGRADE: command =>
        `the version of used OC CLI is invalid. Try to upgrade OC CLI running ${command}`,
      PACKAGE_CREATION_FAIL: error =>
        `An error happened when creating the package: ${error}`,
      PACKAGING_FAIL: (dir, description) =>
        `an error happened while packaging ${dir}: ${description}`,
      PACKAGE_FOLDER_MISSING:
        'Could not find a _package folder to publish. Try running "oc package" first, or do not skip packaging',
      PLUGIN_MISSING_FROM_REGISTRY: (details, command) =>
        `Looks like you are trying to use a plugin in the dev mode (${details}).\nYou need to mock it doing ${command}`,
      PORT_IS_BUSY: port =>
        `The port ${port} is already in use. Specify the optional port parameter to use another port.`,
      PUBLISHING_FAIL: error =>
        `An error happened when publishing the component: ${error}`,
      REGISTRY_NOT_FOUND:
        'oc registries not found. Run "oc registry add <registry href>"',
      TEMPLATE_NOT_FOUND: template =>
        `Error requiring oc-template: "${template}" not found`,
      TEMPLATE_TYPE_NOT_VALID: template =>
        `Error requiring oc-template: "${template}" is not a valid oc-template`,
      TEMPLATE_DEP_MISSING: (template, path) =>
        `Template dependency missing. To fix it run:\n\nnpm install --save-dev ${template}-compiler --prefix ${path}\n\n`
    },
    generic: error => `An error occurred: ${error}`
  },
  messages: {
    cli: {
      cleanAlreadyClean: `The folders are already clean`,
      cleanList: list =>
        `The following folders will be removed:\n${list.join('\n')}`,
      cleanPrompt: 'Proceed? [Y/n]',
      cleanPromptDefault: 'Y',
      cleanSuccess: `Folders removed`,
      initSuccess,
      installCompiler: compiler => `Installing ${compiler} from npm...`,
      installCompilerSuccess: (template, compiler, version) =>
        `${green('✔')} Installed ${compiler} [${template} v${version}]`,
      legacyTemplateDeprecationWarning: (legacyType, newType) =>
        `Template-type "${legacyType}" has been deprecated and is now replaced by "${newType}"`,
      CHANGES_DETECTED: file => `Changes detected on file: ${file}`,
      CHECKING_DEPENDENCIES: 'Ensuring dependencies are loaded...',
      COMPRESSING: path => `Compressing -> ${path}`,
      COMPRESSED: path => `Compressed -> ${path}`,
      ENTER_PASSWORD: 'Enter password:',
      ENTER_USERNAME: 'Enter username:',
      USING_CREDS: 'Using specified credentials',
      HELP_HINT: 'Hint: Run -h with any command to show the help',
      HOT_RELOADING_DISABLED:
        'OC dev is running with hot reloading disabled so changes will be ignored',
      INSTALLING_DEPS: dependencies =>
        `Trying to install missing modules: ${dependencies}\nIf you aren't connected to the internet, or npm isn't configured then this step will fail...`,
      LINKING_DEPENDENCIES: dependencies =>
        `Trying to link missing modules: ${dependencies}\nThe missing dependencies will be linked to component dependencies`,
      MOCKED_PLUGIN: (name, value) =>
        `Mock for plugin has been registered: ${name} () => ${value}`,
      NO_SUCH_COMMAND: command => `No such command '${command}'`,
      PACKAGING: dir => `Packaging -> ${dir}`,
      PACKAGED: dir => `Packaged -> ${dir}`,
      PACKAGING_COMPONENTS: 'Packaging components...',
      PUBLISHED: component => `Published -> ${component}`,
      PUBLISHING: component => `Publishing -> ${component}`,
      REGISTERING_MOCKED_PLUGINS: 'Registering mocked plugins...',
      REGISTRY_ADDED: 'oc registry added',
      REGISTRY_CREDENTIALS_REQUIRED: 'Registry requires credentials.',
      REGISTRY_LIST: 'oc linked registries:',
      REGISTRY_REMOVED: 'oc registry deleted',
      REGISTRY_STARTING: url => `Starting dev registry on ${url} ...`,
      REGISTRY_LIVERELOAD_STARTING: port =>
        `Starting live-reload server on port ${port} ... (to disable use "--hotReloading=false")`,
      RETRYING_10_SECONDS: 'Retrying in 10 seconds...',
      SCANNING_COMPONENTS: 'Looking for components...'
    }
  }
};
