export default ({ templates, staticPath }) =>
  `<script>window.oc=window.oc||{};oc.conf=oc.conf||{};oc.conf.templates=(oc.conf.templates||[]).concat(${JSON.stringify(
    templates
  )});</script><script src="${staticPath}src/oc-client.min.js" type="text/javascript"></script>`;
