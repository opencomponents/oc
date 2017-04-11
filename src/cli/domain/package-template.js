'use strict';

const format = require('stringformat');
const fs = require('fs-extra');
const path = require('path');
const uglifyJs = require('uglify-js');

const hashBuilder = require('../../utils/hash-builder');
const strings = require('../../resources');
const requireTemplate = require('../../utils/require-template');

const javaScriptizeTemplate = function(functionName, data){
  return format('var {0}={0}||{};{0}.components={0}.components||{};{0}.components[\'{1}\']={2}', 'oc', functionName, data.toString());
};

const compileView = function(viewPath, type, cb) {
  const template = fs.readFileSync(viewPath).toString();
  let ocTemplate;

  if (type === 'jade') { type = 'oc-template-jade'; }
  if (type === 'handlebars') { type = 'oc-template-handlebars'; }


  try {
    ocTemplate = requireTemplate(type);
  } catch (err) {
    return cb(err);
  }

  ocTemplate.compile({ template, viewPath }, (err, compiledView) => {
    if (err) { return cb(err);}

    const hashView = hashBuilder.fromString(compiledView.toString()),
      javaScriptizedView = javaScriptizeTemplate(hashView, compiledView);

    return cb(null, {
      hash: hashView,
      view: uglifyJs.minify(javaScriptizedView, {fromString: true}).code
    });
  });
};

module.exports = function(params, callback){

  const viewSrc = params.ocOptions.files.template.src,
    viewPath = path.join(params.componentPath, viewSrc);

  if(!fs.existsSync(viewPath)){
    return callback(format(strings.errors.cli.TEMPLATE_NOT_FOUND, viewSrc));
  }

  try {
    compileView(viewPath, params.ocOptions.files.template.type, (err, compiled) => {
      if (err) {
        return callback(format('{0} compilation failed - {1}', viewSrc, err));
      }
      fs.writeFile(path.join(params.publishPath, 'template.js'), compiled.view, (err) => callback(err, {
        type: params.ocOptions.files.template.type,
        hashKey: compiled.hash,
        src: 'template.js'
      }));
    });
  } catch(e){
    return callback(format('{0} compilation failed - {1}', viewSrc, e));
  }
};
