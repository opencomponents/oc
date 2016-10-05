'use strict';

var format = require('stringformat');
var fs = require('fs-extra');
var handlebars = require('handlebars');
var path = require('path');
var pug = require('pug');
var uglifyJs = require('uglify-js');

var hashBuilder = require('../../utils/hash-builder');
var strings = require('../../resources');
var validator = require('../../registry/domain/validators');

var javaScriptizeTemplate = function(functionName, data){
  return format('var {0}={0}||{};{0}.components={0}.components||{};{0}.components[\'{1}\']={2}', 'oc', functionName, data.toString());
};

var javaScriptizePugTemplate = function(functionName, data){
  return format('{0};var {1}={1}||{};{1}.components={1}.components||{};{1}.components[\'{2}\']=t', data.toString(), 'oc', functionName);
};

var compileView = function(viewPath, type) {
    var template = fs.readFileSync(viewPath).toString(),
        preCompiledView,
        hashView,
        compiledView;

  if(type === 'pug'){ console.log(viewPath);
    preCompiledView = pug.compileClient(template, {
      filename: viewPath,
      compileDebug: false,
      name: 't'
    }).toString();

    hashView = hashBuilder.fromString(preCompiledView);
    compiledView = javaScriptizePugTemplate(hashView, preCompiledView);

  } else if(type === 'handlebars'){
    preCompiledView = handlebars.precompile(template);
    hashView = hashBuilder.fromString(preCompiledView.toString());
    compiledView = javaScriptizeTemplate(hashView, preCompiledView);
  } else {
    throw strings.errors.cli.TEMPLATE_TYPE_NOT_VALID;
  }

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

  try {
    compiled = compileView(viewPath, params.ocOptions.files.template.type);
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