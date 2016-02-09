'use strict';

module.exports = {

  clientScript: '<script class="ocClientScript">{0}</script>{1}',
  
  componentTag: '<oc-component href="{0}" data-hash="{1}" data-name="{2}" data-rendered="true" data-version="{3}">{4}</oc-component>',
  
  componentUnrenderedTag: '<oc-component href="{0}"></oc-component>',
  
  componentUnrenderedTagIe8: '<script class="ocComponent">(function($d,$w,oc){var href=\'href="{0}"\';' + 
                             '$d.write((!!$w.navigator.userAgent.match(/MSIE 8/))?(\'<div data-oc-component="true" \'+href+\'>' +
                             '</div>\'):(\'<oc-component \'+href+\'></oc-component>\'));if(oc) oc.renderUnloadedComponents();}' +
                             '(document,window,((typeof(oc)===\'undefined\')?undefined:oc)));</script>',
  
  renderInfo: '<script>window.oc=window.oc||{};oc.renderedComponents=oc.renderedComponents||{};' + 
              'oc.renderedComponents["{0}"]="{1}";</script>'
};