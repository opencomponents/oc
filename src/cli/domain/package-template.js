'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var path = require('path');
var uglifyJs = require('uglify-js');

var hashBuilder = require('../../utils/hash-builder');
var strings = require('../../resources');
var validator = require('../../registry/domain/validators');

var javaScriptizeTemplate = function(functionName, data){
  return format('var {0}={0}||{};{0}.components={0}.components||{};{0}.components[\'{1}\']={2}', 'oc', functionName, data.toString());
};

var compileView = function(viewPath, type, cb) {
  var template = fs.readFileSync(viewPath).toString();

  try {
    // Support for old component.type convention (jade & handlebars only)
    if (type === 'jade') type = 'oc-template-jade';
    if (type === 'handlebars') type = 'oc-template-handlebars';

    // dynamically require oc-templates
    var ocTemplate = require(type);
  } catch (err) {
    throw strings.errors.cli.TEMPLATE_TYPE_NOT_VALID;
  }

  ocTemplate.compile({ template, viewPath}, (compiledView) => {
    var hashView = hashBuilder.fromString(compiledView.toString()),
        javaScriptizedView = javaScriptizeTemplate(hashView, compiledView);

    cb({
      hash: hashView,
      view: uglifyJs.minify(javaScriptizedView, {fromString: true}).code
    });
  });
};

module.exports = function(params, callback){

  var viewSrc = params.ocOptions.files.template.src,
      viewPath = path.join(params.componentPath, viewSrc),
      compiled;

  if(!fs.existsSync(viewPath)){
    return callback(format(strings.errors.cli.TEMPLATE_NOT_FOUND, viewSrc));
  }

  try {
    compileView(viewPath, params.ocOptions.files.template.type, (compiled) => {
      fs.writeFile(path.join(params.publishPath, 'template.js'), compiled.view, function(err, res){
        callback(err, {
          type: params.ocOptions.files.template.type,
          hashKey: compiled.hash,
          src: 'template.js'
        });
      });
    });
  } catch(e){
    return callback(format('{0} compilation failed - {1}', viewSrc, e));
  }
};
