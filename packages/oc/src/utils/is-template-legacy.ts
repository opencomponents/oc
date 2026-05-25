type LegacyTemplate = 'jade' | 'handlebars';

export default function isTemplateLegacy(
  template: string
): template is LegacyTemplate {
  return template === 'jade' || template === 'handlebars';
}
