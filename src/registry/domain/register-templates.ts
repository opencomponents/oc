import es6Template from 'oc-template-es6';
import handlebarsTemplate from 'oc-template-handlebars';
import jadeTemplate from 'oc-template-jade';
import { Template, TemplateInfo } from '../../types';
import _ from 'lodash';

export default function registerTemplates(
  extraTemplates: Template[]
): {
  templatesHash: Dictionary<Template>;
  templatesInfo: TemplateInfo[];
} {
  const coreTemplates: Template[] = [
    es6Template,
    jadeTemplate,
    handlebarsTemplate
  ];
  const templates = _.union(coreTemplates, extraTemplates);
  const templatesHash = templates.reduce((hash, template) => {
    const type = template.getInfo().type;
    hash[type] = template;
    return hash;
  }, {} as Dictionary<Template>);

  const templatesInfo = templates.map(template => {
    return template.getInfo();
  });

  return {
    templatesHash,
    templatesInfo
  };
}
