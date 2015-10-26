'use strict';

var async = require('async');
var colors = require('colors');
var format = require('stringformat');
var path = require('path');
var _ = require('underscore');

var getComponentsDependencies = require('../domain/get-components-deps');
var getMissingDeps = require('../domain/get-missing-deps');
var getMockedPlugins = require('../domain/get-mocked-plugins');
var npmInstaller = require('../domain/npm-installer');
var oc = require('../../index');
var strings = require('../../resources/index');
var watch = require('../domain/watch');

module.exports = function(dependencies){
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){

    var componentsDir = opts.dirName,
        port = opts.port || 3000,
        packaging = false,
        errors = strings.errors.cli;

    var installMissingDeps = function(missing, cb){
      if(_.isEmpty(missing)){ return cb(); }

      logger.log(format(strings.messages.cli.INSTALLING_DEPS, missing.join(', ')).yellow);
      npmInstaller(missing, componentsDir, function(err, result){
        if(!!err){
          logger.log(err.toString().red);
          throw err;
        }
        cb();
      });
    };

    var watchForChanges = function(components, callback){
      watch(components, componentsDir, function(err, changedFile){
        if(!!err){
          logger.log(format(strings.errors.generic.red, err));
        } else {
          logger.log(format(strings.messages.cli.CHANGES_DETECTED, changedFile).yellow);
          callback(components);
        }
      });
    };

    var packageComponents = function(componentsDirs, callback){
      callback = _.isFunction(callback) ? callback : _.noop;

      var i = 0;

      if(!packaging){
        packaging = true;
        logger.logNoNewLine(strings.messages.cli.PACKAGING_COMPONENTS.yellow);

        async.eachSeries(componentsDirs, function(dir, cb){
          local.package(dir, false, function(err){
            if(!err){ i++; }
            cb(err);
          });
        }, function(error){
          if(!!error){
            var errorDescription = ((error instanceof SyntaxError) || !!error.message) ? error.message : error;
            logger.log(format(strings.errors.cli.PACKAGING_FAIL, componentsDirs[i], errorDescription.red));
            logger.log(strings.messages.cli.RETRYING_10_SECONDS.yellow);
            setTimeout(function(){
              packaging = false;
              packageComponents(componentsDirs);
            }, 10000);
          } else {
            packaging = false;
            logger.log('OK'.green);
            callback();
          }
        });
      }
    };

    var loadDependencies = function(components, cb){
      logger.logNoNewLine(strings.messages.cli.CHECKING_DEPENDENCIES.yellow);

      var dependencies = getComponentsDependencies(components),
          missing = getMissingDeps(dependencies, components);

      if(_.isEmpty(missing)){
        logger.log('OK'.green);
        return cb(dependencies);
      }

      logger.log('FAIL'.red);
      installMissingDeps(missing, function(){
        loadDependencies(components, cb);
      });
    };

    var registerPlugins = function(registry){
      var mockedPlugins = getMockedPlugins(logger);

      mockedPlugins.forEach(function(p){
          registry.register(p);
      });

      registry.on('request', function(data){
        if(data.errorCode === 'PLUGIN_MISSING_FROM_REGISTRY'){
          logger.log(format(strings.errors.cli.PLUGIN_MISSING_FROM_REGISTRY, data.errorDetails, strings.commands.cli.MOCK_PLUGIN.blue).red);
        } else if(data.errorCode === 'PLUGIN_MISSING_FROM_COMPONENT'){
          logger.log(format(strings.errors.cli.PLUGIN_MISSING_FROM_COMPONENT, data.errorDetails).red);
        }
      });
    };

    logger.logNoNewLine(strings.messages.cli.SCANNING_COMPONENTS.yellow);
    local.getComponentsByDir(componentsDir, function(err, components){

      if(err){
        return logger.log(err.red);
      } else if(_.isEmpty(components)){
        return logger.log(format(errors.DEV_FAIL, errors.COMPONENTS_NOT_FOUND).red);
      }

      logger.log('OK'.green);
      _.forEach(components, function(component){
        logger.log('├── '.green + component);
      });

      loadDependencies(components, function(dependencies){
        packageComponents(components, function(){

          var registry = new oc.Registry({
            local: true,
            discovery: true,
            verbosity: 1,
            path: path.resolve(componentsDir),
            port: port,
            baseUrl: format('http://localhost:{0}/', port),
            env: { name: 'local' },
            dependencies: dependencies
          });

          registerPlugins(registry);

          logger.logNoNewLine(format(strings.messages.cli.REGISTRY_STARTING, port).yellow);
          registry.start(function(err, app){

            if(err){
              if(err.code === 'EADDRINUSE'){
                return logger.log(format(strings.errors.cli.PORT_IS_BUSY, port).red);
              } else {
                logger.log(err.red);
              }
            }

            watchForChanges(components, packageComponents);
          });
        });
      });
    });
  };
};
