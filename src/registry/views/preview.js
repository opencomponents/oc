module.exports = vm => {
  const baseUrl = vm.href.replace('http://', '//').replace('https://', '//');
  const { name, version } = vm.component;
  const componentHref = `${baseUrl}${name}/${version}/${vm.qs}`;

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
    </head>
    <body>
      <oc-component href="${componentHref}"></oc-component>
      <script>window.oc=window.oc||{};oc.conf=oc.conf||{};oc.conf.templates=(oc.conf.templates||[]).concat(${JSON.stringify(
    vm.templates
  )});</script>
      <script src="${baseUrl}oc-client/client.js"></script>
      ${vm.liveReload}
    </body>
  </html>`;
};
