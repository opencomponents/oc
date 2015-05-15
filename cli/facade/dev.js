'use strict';

var async = require('async');
var colors = require('colors');
var format = require('stringformat');
var getComponentsDependencies = require('../utils/get-components-deps');
var npmInstaller = require('../utils/npm-installer');
var oc = require('../../index');
var path = require('path');
var strings = require('../../resources/index');
var watch = require('../utils/watch');
var _ = require('underscore');

module.exports = function(dependencies){
  var local = dependencies.local,
      logger = dependencies.logger;

  return function(opts){

    var componentsDir = opts.dirName,
        port = opts.port || 3000,
        packaging = false,
        errors = strings.errors.cli;

    var installMissingDeps = function(missing, cb){
      logger.log(('Trying to install missing modules: ' + JSON.stringify(missing)).yellow);
      logger.log('If you aren\'t connected to the internet, or npm isn\'t configured then this step will fail'.yellow);
        
      npmInstaller(missing, componentsDir, function(err, result){
        if(!!err){
          logger.log(err.toString().red);
          throw err;
        }
        cb();
      });
    };

    var watchForChanges = function(components){
      watch(components, componentsDir, function(err, changedFile){
        if(!!err){
          logger.log(format('An error happened: {0}'.red, err));
        } else {
          logger.log('Changes detected on file: '.yellow + changedFile);
          packageComponents(components);
        }
      });
    };

    var packageComponents = function(componentsDirs, callback){
      callback = _.isFunction(callback) ? callback : _.noop;

      var i = 0;

      if(!packaging){
        packaging = true;
        logger.logNoNewLine('Packaging components...'.yellow);

        async.eachSeries(componentsDirs, function(dir, cb){
          local.package(dir, false, function(err){
            if(!err){
              i++;
            }
            cb(err);
          });
        }, function(error){
          if(!!error){
            var errorDescription = ((error instanceof SyntaxError) || !!error.message) ? error.message : error;
            logger.log(format('an error happened while packaging {0}: {1}', componentsDirs[i], errorDescription.red));
            logger.log('Retrying in 10 seconds...'.yellow);
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
      logger.logNoNewLine('Ensuring dependencies are loaded...'.yellow);

      var dependencies = getComponentsDependencies(components),
          missing = [];

      async.eachSeries(dependencies, function(npmModule, done){
        var pathToModule = path.resolve('node_modules/', npmModule);

        try {
          if(!!require.cache[pathToModule]){
            delete require.cache[pathToModule];
          }

          var required = require(pathToModule);
        } catch (exception) {
          logger.log(('Error loading module: ' + npmModule + ' => ' + exception).red);
          missing.push(npmModule);
        }

        return done();
      }, function(err){
        if(missing.length > 0){
          installMissingDeps(missing, function(){
            loadDependencies(components, function(loadedDependencies){
              cb(loadedDependencies);
            });
          });
        } else {
          logger.log('OK'.green);
          cb(dependencies);
        }
      });
    };

    logger.logNoNewLine('Looking for components...'.yellow);
    local.getComponentsByDir(componentsDir, function(err, components){

      if(err){
        return logger.log(err.red);
      } else if(components.length === 0){
        return logger.log(format(errors.DEV_FAIL, errors.COMPONENTS_NOT_FOUND).red);
      }

      logger.log('OK'.green);
      _.forEach(components, function(component){
        logger.log('>> '.green + component);
      });

      loadDependencies(components, function(dependencies){
        packageComponents(components, function(){
          logger.logNoNewLine(format('Starting dev registry on localhost:{0}...', port).yellow);
          
          var conf = {
            local: true,
            verbosity: 1,
            path: path.resolve(componentsDir),
            port: port,
            baseUrl: format('http://localhost:{0}/', port),
            env: { name: 'local' },
            dependencies: dependencies
          };
          
          var registry = new oc.Registry(conf);

          registry.start(function(err, app){

            if(err){
              if(err.code === 'EADDRINUSE'){
                return logger.log(format('The port {0} is already in use. Specify the optional port parameter to use another port.', port).red);
              } else {
                logger.log(err.red);
              }
            }

            watchForChanges(components);
          });
        });
      });
    });
  };
};