'use strict';

var format = require('stringformat');

var templates = require('./templates');

module.exports = {
  renderedComponent: function(data){

    if(!!data.name && data.renderInfo !== false){
      data.html += format(templates.renderInfo, data.name, data.version);
    }

    if(data.container !== false){ 
      data.html = format(templates.componentTag, data.href, data.key, data.name || '', data.version, data.html);
    }

    return data.html;
  },
  unrenderedComponent: function(href, options){
    return href ? format(templates.componentUnrenderedTag, href) : '';
  }
};