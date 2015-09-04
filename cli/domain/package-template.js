'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var handlebars = require('handlebars');
var jade = require('jade');
var path = require('path');
var uglifyJs = require('uglify-js');

var hashBuilder = require('../../utils/hash-builder');
var strings = require('../../resources');
var validator = require('../../registry/domain/validators');

var javaScriptizeTemplate = function(functionName, data){
  return format('var {0}={0}||{};{0}.components={0}.components||{};{0}.components[\'{1}\']={2}', 'oc', functionName, data.toString());
};

var compileView = function(template, type, fileName, baseDir){
  var preCompiledView;

  if(type === 'jade'){
    preCompiledView = jade.compileClient(template, {
      filename: path.resolve('./' + baseDir + '/' + fileName),
      compileDebug: false,
      name: 't'
    }).toString().replace('function t(locals) {', 'function(locals){');
  } else if(type === 'handlebars'){
    preCompiledView = handlebars.precompile(template);
  } else {
    throw strings.errors.cli.TEMPLATE_TYPE_NOT_VALID;
  }

  var hashView = hashBuilder.fromString(preCompiledView.toString()),
      compiledView = javaScriptizeTemplate(hashView, preCompiledView);

  return {
    hash: hashView,
    view: uglifyJs.minify(compiledView, {fromString: true}).code
  };
};

module.exports = function(params, callback){

  var viewSrc = params.ocOptions.files.template.src,
      viewPath = path.join(params.componentPath, viewSrc),
      compiled;

  if(!fs.existsSync(viewPath)){
    return callback(format(strings.errors.cli.TEMPLATE_NOT_FOUND, viewSrc));
  }

  var template = fs.readFileSync(viewPath).toString();

  try {
    compiled = compileView(template, params.ocOptions.files.template.type, viewSrc, params.componentName);
  } catch(e){
    return callback(format('{0} compilation failed - {1}', viewSrc, e));
  }

  fs.writeFile(path.join(params.publishPath, 'template.js'), compiled.view, function(err, res){
    callback(err, {
      type: params.ocOptions.files.template.type,
      hashKey: compiled.hash,
      src: 'template.js'
    });
  });

};