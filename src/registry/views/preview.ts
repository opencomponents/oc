import type { Component, TemplateInfo } from '../../types';

export default function preview(vm: {
  href: string;
  fallbackClient?: string;
  component: Component;
  qs: string;
  liveReload: string;
  templates: TemplateInfo[];
}): string {
  const baseUrl = vm.href.replace('http://', '//').replace('https://', '//');
  const { name, version } = vm.component;
  const imports = vm.component.oc.files.imports;
  const componentHref = `${baseUrl}${name}/${version}/${vm.qs}`;
  const clientHref = vm.fallbackClient || `${baseUrl}oc-client/client.js`;

  return `<!DOCTYPE html>
  <html>
    <head>
      <style>
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
        };
      </style>
      <meta name="robots" content="index, follow" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      ${
        imports
          ? `<script type="importmap">{"imports": ${JSON.stringify(
              imports
            )}}</script>`
          : ''
      }
    </head>
    <body>
      <oc-component href="${componentHref}"></oc-component>
      <script>window.oc=window.oc||{};oc.conf=oc.conf||{};oc.conf.templates=(oc.conf.templates||[]).concat(${JSON.stringify(
        vm.templates
      )});</script>
      <script src="${clientHref}"></script>
      ${vm.liveReload}
    </body>
  </html>`;
}
