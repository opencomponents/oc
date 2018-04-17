const es6Template = require('oc-template-es6');
const handlebarsTemplate = require('oc-template-handlebars');
const jadeTemplate = require('oc-template-jade');
const _ = require('lodash');

module.exports = function(extraTemplates) {
  const coreTemplates = [es6Template, jadeTemplate, handlebarsTemplate];
  const templates = _.union(coreTemplates, extraTemplates);
  const templatesHash = templates.reduce((hash, template) => {
    try {
      const type = template.getInfo().type;
      hash[type] = template;
      return hash;
    } catch (err) {
      throw err;
    }
  }, {});

  const templatesInfo = templates.map(template => {
    try {
      return template.getInfo();
    } catch (err) {
      throw err;
    }
  });

  return {
    templatesHash,
    templatesInfo
  };
};
