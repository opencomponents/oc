'use strict';

const async = require('async');
const _ = require('lodash');

const settings = require('../../resources/settings');
const strings = require('../../resources');

const sanitise = {
  componentParams: function(component, options, callback) {
    return _.extend(sanitise.options(options, callback), {
      componentName: component
    });
  },
  componentsParams: function(components, options, callback) {
    return _.extend(sanitise.options(options, callback), {
      components: components
    });
  },
  headers: function(h) {
    return _.extend({}, h, { accept: settings.registry.acceptRenderedHeader });
  },
  options: function(options, callback) {
    if (!callback && _.isFunction(options)) {
      callback = options;
      options = {};
    }

    return {
      callback: callback,
      options: options || {}
    };
  }
};

const validate = {
  callback: function(c) {
    if (!c || !_.isFunction(c)) {
      throw new Error(
        strings.errors.registry.NESTED_RENDERER_CALLBACK_IS_NOT_VALID
      );
    }
  },
  componentParams: function(params) {
    if (!params.componentName) {
      throw new Error(
        strings.errors.registry.NESTED_RENDERER_COMPONENT_NAME_IS_NOT_VALID
      );
    }

    validate.callback(params.callback);
  },
  componentsParams: function(params) {
    if (_.isEmpty(params.components)) {
      throw new Error(
        strings.errors.registry.NESTED_RENDERER_COMPONENTS_IS_NOT_VALID
      );
    }

    validate.callback(params.callback);
  }
};

module.exports = function(renderer, conf) {
  return {
    renderComponent: function(componentName, renderOptions, callback) {
      const p = sanitise.componentParams(
        componentName,
        renderOptions,
        callback
      );
      validate.componentParams(p);

      return renderer(
        {
          conf: conf,
          headers: sanitise.headers(p.options.headers),
          name: componentName,
          parameters: p.options.parameters || {},
          version: p.options.version || ''
        },
        result => {
          if (result.response.error) {
            return p.callback(result.response.error);
          } else {
            return p.callback(null, result.response.html);
          }
        }
      );
    },
    renderComponents: function(components, renderOptions, callback) {
      const p = sanitise.componentsParams(components, renderOptions, callback);
      validate.componentsParams(p);

      async.map(
        p.components,
        (component, cb) => {
          renderer(
            {
              conf: conf,
              headers: sanitise.headers(p.options.headers),
              name: component.name,
              parameters: _.extend(
                {},
                p.options.parameters,
                component.parameters
              ),
              version: component.version || ''
            },
            result => {
              const error = result.response.error;
              cb(null, error ? new Error(error) : result.response.html);
            }
          );
        },
        p.callback
      );
    }
  };
};
