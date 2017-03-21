'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var handlebars = require('oc-template-handlebars');
var jade = require('oc-template-jade');
var path = require('path');
var uglifyJs = require('uglify-js');

var hashBuilder = require('../../utils/hash-builder');
var strings = require('../../resources');
var validator = require('../../registry/domain/validators');

var templateEngines = {
  handlebars,
  jade
};

var javaScriptizeTemplate = function(functionName, data){
  return format('var {0}={0}||{};{0}.components={0}.components||{};{0}.components[\'{1}\']={2}', 'oc', functionName, data.toString());
};

var compileView = function(viewPath, type, cb) {
  var template = fs.readFileSync(viewPath).toString();

  if(!templateEngines[type]){
    throw strings.errors.cli.TEMPLATE_TYPE_NOT_VALID;
  }

  var compiledView = templateEngines[type].compile({ template, viewPath }, compiledView => {
    var hashView = hashBuilder.fromString(compiledView.toString()),
        javaScriptizedView = javaScriptizeTemplate(hashView, compiledView);

    return cb({
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
    compiled = compileView(viewPath, params.ocOptions.files.template.type, compiled => {
      fs.writeFile(path.join(params.publishPath, 'template.js'), compiled.view, function(err, res){
        return callback(err, {
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
