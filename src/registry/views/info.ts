import { Component } from '../../types';

import getComponentAuthor from './partials/component-author';
import getComponentParameters from './partials/component-parameters';
import getComponentState from './partials/component-state';
import getComponentVersions from './partials/component-versions';
import infoJS from './static/info';
import getLayout from './partials/layout';
import getProperty from './partials/property';
import isTemplateLegacy from '../../utils/is-template-legacy';

interface Vm {
  parsedAuthor: { name?: string; email?: string; url?: string };
  component: Component;
  dependencies: string[];
  href: string;
  sandBoxDefaultQs: string;
  title: string;
  repositoryUrl: string | null;
}

export default function info(vm: Vm): string {
  const componentAuthor = getComponentAuthor(vm);
  const componentParameters = getComponentParameters(vm);
  const componentState = getComponentState(vm);
  const componentVersions = getComponentVersions(vm);
  const layout = getLayout(vm);
  const property = getProperty();

  const showArray = (title: string, arr?: string[]) =>
    property(title, !!arr && arr.length > 0 ? arr.join(', ') : 'none');

  const { component, dependencies, href, repositoryUrl, sandBoxDefaultQs } = vm;

  const componentHref = `${href}${component.name}/${component.version}/${sandBoxDefaultQs}`;

  const publishDate = component.oc.date
    ? new Date(component.oc.date)
    : 'not available';

  const publishAgent = component.oc.version
    ? `OC CLI ${component.oc.version}`
    : 'not available';

  const templateType = component.oc.files.template.type;
  const compiler = `${templateType}-compiler`;
  const template = `${templateType} (${
    isTemplateLegacy(templateType)
      ? 'legacy'
      : compiler + '@' + component.oc.files.template.version
  })`;

  const content = `<a class="back" href="${href}">&lt;&lt; All components</a>
    <h2>${component.name} &nbsp;${componentVersions()}</h2>
    <p class="w-100">${component.description} ${componentState()}</p>
    <h3>Component Info</h3>
    ${property('Repository', repositoryUrl || 'not available', !!repositoryUrl)}
    ${componentAuthor()}
    ${property('Publish date', publishDate)}
    ${property('Publish agent', publishAgent)}
    ${property('Template', template)}
    ${showArray('Node.js dependencies', dependencies)}
    ${showArray('Plugin dependencies', component.oc.plugins)}
    ${componentParameters()}
    <h3>Code</h3>
    <p>
      You can edit the following area and then
      <a href="#refresh" class="refresh-preview">refresh</a>
      to apply the change into the preview window.
    </p>
    <div class="field"><p>Component's href:</p></div>
    <textarea class="w-100" id="href" placeholder="Insert component href here">${componentHref}</textarea>
    <div class="field"><p>Accept-Language header:</p></div>
    <input class="w-100" id="lang" type="text" value="*" />
    <h3>
      Preview (
      <a class="refresh-preview" href="#refresh">Refresh</a>
      |
      <a class="open-preview" href="#open">Open</a>
      )
    </h3>
    <iframe class="preview" src="~preview/${sandBoxDefaultQs}"></iframe>`;

  const scripts = `<script>var thisComponentHref="${href}${component.name}/";
    ${infoJS}
  </script>`;

  return layout({ content, scripts });
}
