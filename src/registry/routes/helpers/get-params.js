const _ = require('lodash');
const __ = require('underscore');

function getParams(component) {
  let params = {};
  if (component.oc.parameters) {
    const mandatoryParams = _.filter(_.keys(component.oc.parameters), (paramName) => {
      const param = component.oc.parameters[paramName];
      return !!param.mandatory && !!param.example;
    });

    params = _.mapValues(_.pick(component.oc.parameters, mandatoryParams), x => x.example);
  }

  return params;
}

function getParams__(component) {
  let params = {};
  if (component.oc.parameters) {
    const mandatoryParams = __.filter(__.keys(component.oc.parameters), (paramName) => {
      const param = component.oc.parameters[paramName];
      return !!param.mandatory && !!param.example;
    });

    params = __.mapObject(__.pick(component.oc.parameters, mandatoryParams), (param) => param.example);
  }

  return params;
}

const getParamsV2 = (component) => {
  const params = {};
  if (component.oc.parameters) {
    Object.keys(component.oc.parameters).forEach((key) => {
      if (component.oc.parameters[key].mandatory) {
        params[key] = component.oc.parameters[key].example;
      }
    });
  }
  return params;
};

module.exports = { getParams__, getParams, getParamsV2 };
