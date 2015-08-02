'use strict';

var async = require('async');
var CleanCss = require('clean-css');
var detective = require('detective');
var format = require('stringformat');
var fs = require('fs-extra');
var handlebars = require('handlebars');
var hashBuilder = require('../../utils/hash-builder');
var jade = require('jade');
var nodeDir = require('node-dir');
var request = require('../../utils/request');
var path = require('path');
var settings = require('../../resources/settings');
var spawnSync = require('spawn-sync');
var Targz = require('tar.gz');
var uglifyJs = require('uglify-js');
var validator = require('../../registry/domain/validators');
var _ = require('underscore');

module.exports = function(){

  var targz = new Targz();

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
      throw 'template type not supported';
    }

    var hashView = hashBuilder.fromString(preCompiledView.toString()),
        compiledView = javaScriptizeTemplate(hashView, preCompiledView);

    return {
      hash: hashView,
      view: uglifyJs.minify(compiledView, {fromString: true}).code
    };
  };

  var getLocalDependencies = function(componentPath, serverContent){

    var requires = {
      files: {},
      modules: []
    };

    var localRequires = detective(serverContent);

    var tryEncapsulating = function(required){
      var requiredPath = path.resolve(componentPath, required),
          ext = path.extname(requiredPath).toLowerCase();

      if(ext === ''){
        requiredPath += '.json';
      } else if(ext !== '.json'){
        throw 'Requiring local js files is not allowed. Keep it small.';
      }

      if(!fs.existsSync(requiredPath)){
        throw requiredPath + ' not found. Only json files are require-able.';
      }

      var content = fs.readFileSync(requiredPath).toString();
      return JSON.parse(content);
    };

    var isLocalFile = function(f){
      return _.first(f) === '/' || _.first(f) === '.';
    };

    _.forEach(localRequires, function(required){
      if(isLocalFile(required)) {
        requires.files[required] = tryEncapsulating(required);
      } else {
        requires.modules.push(required);
      }
    });

    return requires;
  };

  var getSandBoxedJs = function(wrappedRequires, serverContent){
    if(_.keys(wrappedRequires).length > 0){
      serverContent = 'var __sandboxedRequire = require, __localRequires=' + JSON.stringify(wrappedRequires) +
                      ';require=function(x){return __localRequires[x] ? __localRequires[x] : __sandboxedRequire(x); };\n' +
                      serverContent;
    }

    return uglifyJs.minify(serverContent, {fromString: true}).code;
  };

  var preprocessors = function(oc, serverjs){
      if(!oc.preprocessors || oc.preprocessors.length === 0){
          return serverjs;
      }

      var interim = serverjs;
      oc.preprocessors.forEach(function(item){
          var result = spawnSync(item.command, item.args || [], {
              input: interim
          });

          if(result.status !== 0){
              throw new Error(result.stderr);
          } else {
              interim = result.stdout;
          }
      });

      return interim;
  };

  var missingDependencies = function(requires, component){
    return _.filter(requires, function(dep){
      return !_.contains(_.keys(component.dependencies), dep);
    });
  };

  return _.extend(this, {
    cleanup: function(compressedPackagePath, callback){
      return fs.unlink(compressedPackagePath, callback);
    },
    compress: function(input, output, callback){
      return targz.compress(input, output, callback);
    },
    getComponentsByDir: function(componentsDir, callback){

      try {
        var components = fs.readdirSync(componentsDir).filter(function(file){

          var filePath = path.resolve(componentsDir, file),
              isDir = fs.lstatSync(filePath).isDirectory(),
              packagePath = path.join(filePath, 'package.json');

          if(!isDir || !fs.existsSync(packagePath)){
            return false;
          }

          var content = fs.readJsonSync(packagePath);

          if(!content.oc || !!content.oc.packaged){
            return false;
          }

          return true;
        });

        var fullPathComponents = _.map(components, function(component){
          return path.resolve(componentsDir, component);
        });

        callback(null, fullPathComponents);

      } catch(err){
        return callback(err);
      }
    },
    getLocalNpmModules: function(componentsDir){

      var nodeFolder = path.join(componentsDir, 'node_modules');

      if(!fs.existsSync(nodeFolder)){
        return [];
      }

      return fs.readdirSync(nodeFolder).filter(function(file){

        var filePath = path.resolve(nodeFolder, file),
            isBin = file === '.bin',
            isDir = fs.lstatSync(filePath).isDirectory();

        return isDir && !isBin;
      });
    },
    info: function(callback){
      return fs.readJson(settings.configFile.src, callback);
    },
    init: function(componentName, templateType, callback){

      if(!validator.validateComponentName(componentName)){
        return callback('name not valid');
      }

      if(!validator.validateTemplateType(templateType)){
        return callback('template type not valid');
      }

      try {

        var pathDir = '../../components/base-component-' + templateType,
            baseComponentDir = path.resolve(__dirname, pathDir),
            npmIgnorePath = path.resolve(__dirname, pathDir + '/.npmignore');

        fs.ensureDirSync(componentName);
        fs.copySync(baseComponentDir, componentName);
        fs.copySync(npmIgnorePath, componentName + '/.gitignore');

        var componentPath = path.resolve(componentName, 'package.json'),
          component = _.extend(fs.readJsonSync(componentPath), {
            name: componentName
          });

        fs.outputJsonSync(componentPath, component);

        return callback(null, { ok: true });
      } catch(e){
        return callback(e);
      }
    },
    link: function(componentName, componentVersion, callback){

      fs.readJson(settings.configFile.src, function(err, localConfig){
        if(!localConfig || !localConfig.registries || localConfig.registries.length === 0){
          return callback('Registry configuration not found. Add a registry reference to the project first');
        }

        localConfig.components = localConfig.components || {};

        if(!!localConfig.components[componentName]){
          return callback('Component already linked in the project');
        }

        var componentHref = format('{0}/{1}/{2}', localConfig.registries[0], componentName, componentVersion);

        request(componentHref, function(err, res){
          if(err || !res){
            return callback('Component not available');
          }

          try {
            var apiResponse = JSON.parse(res);
            if(apiResponse.type !== 'oc-component'){
              return callback('not a valid oc Component');
            }
          } catch(e){
            return callback('not a valid oc Component');
          }

          localConfig.components[componentName] = componentVersion;
          fs.writeJson(settings.configFile.src, localConfig, callback);
        });
      });
    },
    mock: function(params, callback){

      fs.readJson(settings.configFile.src, function(err, localConfig){

        localConfig = localConfig || {};

        var mockType = params.targetType + 's';

        if(!localConfig.mocks){
          localConfig.mocks = {};
        }

        if(!localConfig.mocks[mockType]){
          localConfig.mocks[mockType] = {};
        }

        if(!localConfig.mocks[mockType].static){
          localConfig.mocks[mockType].static = {};
        }

        localConfig.mocks[mockType].static[params.targetName] = params.targetValue;

        return fs.writeJson(settings.configFile.src, localConfig, callback);
      });
    },
    package: function(componentPath, minify, callback){

      if(_.isFunction(minify)){
        callback = minify;
        minify = true;
      }

      var files = fs.readdirSync(componentPath),
          publishPath = path.join(componentPath, '_package');

      if(_.contains(files, '_package')){
        fs.removeSync(publishPath);
      }

      fs.mkdirSync(publishPath);

      var componentPackagePath = path.join(componentPath, 'package.json'),
          ocPackagePath = path.join(__dirname, '../../package.json');

      if(!fs.existsSync(componentPackagePath)){
        return callback('component does not contain package.json');
      } else if(!fs.existsSync(ocPackagePath)){
        return callback('error resolving oc internal dependencies');
      }

      var component = fs.readJsonSync(componentPackagePath),
          viewPath = path.join(componentPath, component.oc.files.template.src);

      if(!fs.existsSync(viewPath)){
        return callback(format('file {0} not found', component.oc.files.template.src));
      } else if(!validator.validateComponentName(component.name)){
        return callback('name not valid');
      }

      var ocInfo = fs.readJsonSync(ocPackagePath),
          template = fs.readFileSync(viewPath).toString(),
          compiled;

      try {
        compiled = compileView(template, component.oc.files.template.type, component.oc.files.template.src, component.name);
      } catch(e){
        return callback({
          message: format('{0} compilation failed - {1}', component.oc.files.template.src, e.toString())
        });
      }

      fs.writeFileSync(path.join(publishPath, 'template.js'), compiled.view);

      component.oc.files.template = {
        type: component.oc.files.template.type,
        hashKey: compiled.hash,
        src: 'template.js'
      };

      delete component.oc.files.client;
      component.oc.version = ocInfo.version;
      component.oc.packaged = true;

      if(!!component.oc.files.data){
        var dataPath = path.join(componentPath, component.oc.files.data),
            serverContent = fs.readFileSync(dataPath).toString(),
            wrappedRequires;

        try {
          wrappedRequires = getLocalDependencies(componentPath, serverContent);
        } catch(e){
          if(e instanceof SyntaxError){
            return callback({
              message: format('Error while parsing {0}: {1}', dataPath, e)
            });
          }
          return callback(e);
        }

        var missingDeps = missingDependencies(wrappedRequires.modules, component);
        if(missingDeps.length > 0){
          return callback('Missing dependencies from package.json => ' + JSON.stringify(missingDeps));
        }

        var sandBoxedJs = getSandBoxedJs(wrappedRequires.files, preprocessors(component.oc, serverContent));
        fs.writeFileSync(path.join(publishPath, 'server.js'), sandBoxedJs);

        component.oc.files.dataProvider = {
          type: 'node.js',
          hashKey: hashBuilder.fromString(sandBoxedJs),
          src: 'server.js'
        };

        delete component.oc.files.data;
      }

      if(!component.oc.files.static){
        component.oc.files.static = [];
      }

      if(!_.isArray(component.oc.files.static)){
        component.oc.files.static = [component.oc.files.static];
      }

      fs.writeJsonSync(path.join(publishPath, 'package.json'), component);

      var copyDir = function(staticComponent, staticPath, cb){
        if(!fs.existsSync(staticPath)){
          return cb('"' + staticPath + '" not found');
        } else if(!fs.lstatSync(staticPath).isDirectory()){
          return cb('"' + staticPath + '" must be a directory');
        } else {
          nodeDir.paths(staticPath, function(err, res){
            fs.ensureDirSync(path.join(publishPath, staticComponent));
            _.forEach(res.files, function(filePath){
              var fileName = path.basename(filePath),
                  fileExt = path.extname(filePath),
                  fileDestination = path.join(publishPath, staticComponent, fileName),
                  fileContent,
                  minifiedContent;

              if(minify && fileExt === '.js' && component.oc.minify !== false){
                fileContent = fs.readFileSync(filePath).toString();
                minifiedContent = uglifyJs.minify(fileContent, {fromString: true}).code;

                fs.writeFileSync(fileDestination, minifiedContent);
              } else if(minify && fileExt === '.css' && component.oc.minify !== false){
                fileContent = fs.readFileSync(filePath).toString();
                var options = (component.oc.ie8css === true) ? {compatibility:'ie8'} : null;
                minifiedContent = new CleanCss(options).minify(fileContent).styles;

                fs.writeFileSync(fileDestination, minifiedContent);
              } else {
                fs.copySync(filePath, fileDestination);
              }
            });
            cb(null, 'ok');
          });
        }
      };

      if(component.oc.files.static.length === 0){
        return callback(null, component);
      }
      async.eachSeries(component.oc.files.static, function(staticDir, cb){
        copyDir(staticDir, path.join(componentPath, staticDir), cb);
      }, function(errors){
        if(errors){
          return callback(errors);
        }

        callback(null, component);
      });
    },
    unlink: function(componentName, callback){
      fs.readJson(settings.configFile.src, function(err, localConfig){

        localConfig = localConfig || {};

        if(!!localConfig.components[componentName]){
          delete localConfig.components[componentName];
        }

        fs.writeJson(settings.configFile.src, localConfig, callback);
      });
    }
  });
};
