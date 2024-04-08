import _ from 'lodash';
import es6Template from 'oc-template-es6';
import handlebarsTemplate from 'oc-template-handlebars';
import jadeTemplate from 'oc-template-jade';
import type { Template, TemplateInfo } from '../../types';

export default function registerTemplates(
  extraTemplates: Template[],
  dev = false
): {
  templatesHash: Record<string, Template>;
  templatesInfo: TemplateInfo[];
} {
  const coreTemplates: Template[] = [
    es6Template,
    jadeTemplate,
    handlebarsTemplate
  ];
  const templates = _.union(coreTemplates, extraTemplates);
  const templatesHash = templates.reduce(
    (hash, template) => {
      const type = template.getInfo().type;
      hash[type] = template;
      return hash;
    },
    {} as Record<string, Template>
  );

  const templatesInfo = templates.map((template) => {
    const { externals, ...rest } = template.getInfo();
    return {
      ...rest,
      externals: externals.map(({ url, devUrl, ...rest }) => ({
        ...rest,
        url: dev && devUrl ? devUrl : url
      }))
    };
  });

  return {
    templatesHash,
    templatesInfo
  };
}
