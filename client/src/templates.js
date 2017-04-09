'use strict';

module.exports = {

  clientScript: '<script class="ocClientScript">{0}</script>{1}',

  componentTag: '<oc-component href="{0}" data-hash="{1}" data-name="{2}" data-rendered="true" data-version="{3}">{4}</oc-component>',

  componentUnrenderedTag: '<oc-component href="{0}"></oc-component>',

  renderInfo: '<script>window.oc=window.oc||{};oc.renderedComponents=oc.renderedComponents||{};' +
              'oc.renderedComponents["{0}"]="{1}";</script>'
};